import { signOut } from "./server";

/** Ends the session on the server, then does a full reload so no signed-in state lingers. */
export async function signOutAndLeave() {
  try {
    await signOut();
  } catch {
    // signOut ends by redirecting, which surfaces as a thrown value on the client.
  } finally {
    window.location.replace("/welcome");
  }
}
