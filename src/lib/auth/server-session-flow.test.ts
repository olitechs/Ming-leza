// @vitest-environment node

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  requestUrl: "https://preview.mingleza.test/welcome?mode=signin",
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      validator: () => builder,
      handler: (handler: (input: never) => unknown) => handler,
    };
    return builder;
  },
}));

vi.mock("@tanstack/react-start/server", () => ({
  getCookies: () => Object.fromEntries(state.cookies),
  setCookie: (name: string, value: string) => state.cookies.set(name, value),
  setResponseHeader: vi.fn(),
  getRequest: () => ({ url: state.requestUrl }),
}));

import { exchangeEmailMagicLink, getMyAccess, sendOtp } from "./server";

type JsonObject = Record<string, unknown>;

function writeJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? (JSON.parse(text) as JsonObject) : {};
}

function makeTestAccessToken() {
  const payload = Buffer.from(
    JSON.stringify({ sub: "phase2-test-user", role: "authenticated", exp: 4_102_444_800 }),
  ).toString("base64url");
  return `test.${payload}.signature`;
}

describe("password-based auth migration and session flow", () => {
  let server: Server;
  let supabaseUrl: string;
  let otpPayload: JsonObject | undefined;
  let otpRedirectTo: string | null | undefined;
  let tokenPayload: JsonObject | undefined;
  let profilePayload: JsonObject | undefined;
  let userAuthorization: string | undefined;

  beforeAll(async () => {
    server = createServer(async (request, response) => {
      const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
      if (url.pathname === "/auth/v1/otp" && request.method === "POST") {
        otpPayload = await readBody(request);
        otpRedirectTo = url.searchParams.get("redirect_to");
        writeJson(response, 200, { message_id: "test-message" });
        return;
      }

      if (url.pathname === "/auth/v1/token" && request.method === "POST") {
        tokenPayload = await readBody(request);
        writeJson(response, 200, {
          access_token: makeTestAccessToken(),
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "phase2-test-refresh-token",
          user: {
            id: "phase2-test-user",
            aud: "authenticated",
            role: "authenticated",
            email: "phase2-test@example.invalid",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        });
        return;
      }

      if (url.pathname === "/auth/v1/user" && request.method === "GET") {
        userAuthorization = request.headers.authorization;
        writeJson(response, 200, {
          id: "phase2-test-user",
          aud: "authenticated",
          role: "authenticated",
          email: "phase2-test@example.invalid",
          created_at: "2026-01-01T00:00:00.000Z",
        });
        return;
      }

      if (url.pathname === "/rest/v1/profiles" && request.method === "POST") {
        profilePayload = await readBody(request);
        response.writeHead(201, { "content-length": "0" });
        response.end();
        return;
      }

      if (url.pathname === "/rest/v1/age_verifications" && request.method === "GET") {
        writeJson(response, 200, []);
        return;
      }

      writeJson(response, 404, { message: "Unexpected request" });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test auth server did not start");
    supabaseUrl = `http://127.0.0.1:${address.port}`;
    vi.stubEnv("VITE_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "phase2-test-publishable-key");
    vi.stubEnv("SITE_URL", "");
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("rejects passwordless OTP requests and still exchanges a signup-confirmation callback into a session", async () => {
    state.cookies.clear();
    otpPayload = undefined;
    otpRedirectTo = undefined;
    tokenPayload = undefined;
    profilePayload = undefined;
    userAuthorization = undefined;

    const sent = await sendOtp({
      data: { method: "email", identifier: "phase2-test@example.invalid" },
    });

    expect(sent).toEqual({
      ok: false,
      message: "Passwordless sign-in is no longer supported. Use your email and password.",
    });
    expect(otpPayload).toBeUndefined();
    expect(otpRedirectTo).toBeUndefined();

    const exchanged = await exchangeEmailMagicLink({ data: { code: "single-use-test-code" } });

    expect(exchanged).toEqual({ ok: true });
    expect(tokenPayload).toMatchObject({
      auth_code: "single-use-test-code",
      code_verifier: expect.any(String),
    });
    expect(Object.keys(Object.fromEntries(state.cookies))).toContainEqual(
      expect.stringMatching(/auth-token/),
    );
    expect(profilePayload).toEqual({
      id: "phase2-test-user",
      display_name: "New member",
      friends_enabled: true,
      dating_enabled: false,
      is_discoverable: false,
    });

    const access = await getMyAccess();

    expect(access).toEqual({ authenticated: true, adultVerified: false });
    expect(userAuthorization).toMatch(/^Bearer test\./);
  });
});
