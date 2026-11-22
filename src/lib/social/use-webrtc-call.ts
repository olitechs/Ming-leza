import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CallMedia = "audio" | "video";
type CallStatus = "idle" | "incoming" | "calling" | "connected" | "error";
type SignalKind = "offer" | "answer" | "ice" | "hangup" | "decline";
type CallSignal = {
  kind: SignalKind;
  conversationId: string;
  callId: string;
  from: string;
  to: string;
  media?: CallMedia;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};
type SendSignal = Omit<CallSignal, "conversationId" | "from">;

type Channel = ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]>;

function isCallSignal(value: unknown): value is CallSignal {
  if (!value || typeof value !== "object") return false;
  const signal = value as Record<string, unknown>;
  const kind = signal["kind"];
  return (
    typeof kind === "string" &&
    ["offer", "answer", "ice", "hangup", "decline"].includes(kind) &&
    typeof signal["conversationId"] === "string" &&
    typeof signal["callId"] === "string" &&
    typeof signal["from"] === "string" &&
    typeof signal["to"] === "string"
  );
}

export function useWebRtcCall({
  conversationId,
  otherUserId,
}: {
  conversationId: string | null;
  otherUserId: string | null;
}) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [media, setMedia] = useState<CallMedia | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const channelRef = useRef<Channel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const callIdRef = useRef<string | null>(null);
  const statusRef = useRef<CallStatus>("idle");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<{ callId: string; candidate: RTCIceCandidateInit }[]>([]);

  const setCallStatus = useCallback((next: CallStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const sendSignal = useCallback(
    async (signal: SendSignal) => {
      const channel = channelRef.current;
      const userId = userIdRef.current;
      if (!channel || !userId || !conversationId)
        throw new Error("Call signaling is not connected.");
      const result = await channel.send({
        type: "broadcast",
        event: "call_signal",
        payload: { ...signal, conversationId, from: userId },
      });
      if (result !== "ok") throw new Error("Call signaling could not reach the other member.");
    },
    [conversationId],
  );

  const stopMedia = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    callIdRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMedia(null);
    setError("");
    setCallStatus("idle");
  }, [setCallStatus]);

  const createPeer = useCallback(
    (targetUserId: string, callId: string) => {
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = peer;
      const stream = localStreamRef.current;
      if (stream) stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        void sendSignal({
          kind: "ice",
          callId,
          to: targetUserId,
          candidate: event.candidate.toJSON(),
        }).catch(() => undefined);
      };
      peer.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        setRemoteStream(stream);
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") setCallStatus("connected");
        if (peer.connectionState === "failed") {
          setError("The network could not establish this call. Try again on another connection.");
          setCallStatus("error");
        }
      };
      return peer;
    },
    [sendSignal, setCallStatus],
  );

  const receiveSignal = useCallback(
    async (value: unknown) => {
      if (!isCallSignal(value) || !conversationId || !otherUserId) return;
      const signal = value;
      if (
        signal.conversationId !== conversationId ||
        signal.from !== otherUserId ||
        signal.to !== userIdRef.current
      )
        return;

      if (signal.kind === "offer") {
        if (
          statusRef.current !== "idle" ||
          !signal.sdp ||
          (signal.media !== "audio" && signal.media !== "video")
        )
          return;
        callIdRef.current = signal.callId;
        pendingOfferRef.current = signal.sdp;
        pendingIceRef.current = pendingIceRef.current.filter(
          (entry) => entry.callId === signal.callId,
        );
        setMedia(signal.media);
        setCallStatus("incoming");
        return;
      }
      if (signal.kind === "ice" && signal.candidate && signal.callId !== callIdRef.current) {
        pendingIceRef.current.push({ callId: signal.callId, candidate: signal.candidate });
        return;
      }
      if (signal.callId !== callIdRef.current) return;
      if (signal.kind === "answer" && signal.sdp && peerRef.current) {
        await peerRef.current.setRemoteDescription(signal.sdp);
        for (const entry of pendingIceRef.current.filter((item) => item.callId === signal.callId)) {
          await peerRef.current.addIceCandidate(entry.candidate);
        }
        pendingIceRef.current = pendingIceRef.current.filter(
          (item) => item.callId !== signal.callId,
        );
      } else if (signal.kind === "ice" && signal.candidate) {
        if (peerRef.current?.remoteDescription) {
          await peerRef.current.addIceCandidate(signal.candidate);
        } else {
          pendingIceRef.current.push({ callId: signal.callId, candidate: signal.candidate });
        }
      } else if (signal.kind === "hangup" || signal.kind === "decline") {
        stopMedia();
      }
    },
    [conversationId, otherUserId, setCallStatus, stopMedia],
  );

  useEffect(() => {
    if (!conversationId || !otherUserId) {
      setReady(false);
      stopMedia();
      return;
    }
    let disposed = false;
    let channel: Channel | null = null;
    const supabase = getSupabaseBrowserClient();
    setReady(false);
    void supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (disposed) return;
      userIdRef.current = data.user?.id ?? null;
      if (!userIdRef.current) return;
      channel = supabase
        .channel(`call:${conversationId}`, { config: { private: true } })
        .on("broadcast", { event: "call_signal" }, ({ payload }: { payload: unknown }) => {
          void receiveSignal(payload).catch(() => {
            setError("Call signaling failed. Please end the call and try again.");
            setCallStatus("error");
          });
        })
        .subscribe((channelStatus: string) => {
          if (!disposed) setReady(channelStatus === "SUBSCRIBED");
        });
      channelRef.current = channel;
    });
    return () => {
      disposed = true;
      if (callIdRef.current && userIdRef.current && channel) {
        void channel.send({
          type: "broadcast",
          event: "call_signal",
          payload: {
            kind: "hangup",
            conversationId,
            callId: callIdRef.current,
            from: userIdRef.current,
            to: otherUserId,
          },
        });
      }
      setReady(false);
      stopMedia();
      if (channel) void supabase.removeChannel(channel);
      channelRef.current = null;
      userIdRef.current = null;
    };
  }, [conversationId, otherUserId, receiveSignal, setCallStatus, stopMedia]);

  const startCall = useCallback(
    async (callMedia: CallMedia) => {
      if (!ready || !conversationId || !otherUserId || statusRef.current !== "idle") return;
      setError("");
      setMedia(callMedia);
      setCallStatus("calling");
      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callMedia === "video",
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        const peer = createPeer(otherUserId, callId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await sendSignal({ kind: "offer", callId, to: otherUserId, media: callMedia, sdp: offer });
      } catch (cause) {
        stopMedia();
        setCallStatus("error");
        setError(
          cause instanceof DOMException && cause.name === "NotAllowedError"
            ? "Allow microphone and camera access to start a call."
            : cause instanceof Error
              ? cause.message
              : "The call could not be started.",
        );
      }
    },
    [conversationId, createPeer, otherUserId, ready, sendSignal, setCallStatus, stopMedia],
  );

  const acceptCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    const callId = callIdRef.current;
    if (!offer || !callId || !otherUserId || !media) return;
    setError("");
    setCallStatus("calling");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: media === "video",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const peer = createPeer(otherUserId, callId);
      await peer.setRemoteDescription(offer);
      for (const entry of pendingIceRef.current.filter((item) => item.callId === callId)) {
        await peer.addIceCandidate(entry.candidate);
      }
      pendingIceRef.current = pendingIceRef.current.filter((item) => item.callId !== callId);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal({ kind: "answer", callId, to: otherUserId, sdp: answer });
    } catch (cause) {
      stopMedia();
      setCallStatus("error");
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Allow microphone and camera access to accept the call."
          : cause instanceof Error
            ? cause.message
            : "The call could not be accepted.",
      );
    }
  }, [createPeer, media, otherUserId, sendSignal, setCallStatus, stopMedia]);

  const declineCall = useCallback(async () => {
    const callId = callIdRef.current;
    if (callId && otherUserId) {
      await sendSignal({ kind: "decline", callId, to: otherUserId }).catch(() => undefined);
    }
    stopMedia();
  }, [otherUserId, sendSignal, stopMedia]);

  const endCall = useCallback(async () => {
    const callId = callIdRef.current;
    if (callId && otherUserId) {
      await sendSignal({ kind: "hangup", callId, to: otherUserId }).catch(() => undefined);
    }
    stopMedia();
  }, [otherUserId, sendSignal, stopMedia]);

  return {
    ready,
    status,
    media,
    localStream,
    remoteStream,
    error,
    startCall,
    acceptCall,
    declineCall,
    endCall,
  };
}
