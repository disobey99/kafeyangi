"use client";

import { useState, useRef, useEffect, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Radio, Mic, Volume2, VolumeX, X, Loader2, AlertCircle } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import {
  PLAYBACK_GAIN_DEFAULT,
  getMicEnvironmentError,
  getRecorderOptions,
  getSupportedMimeType,
  micErrorMessage,
  playWalkieAudio,
  playWalkiePttBeep,
  requestMicStream,
} from "@/lib/walkie-talkie-audio";

type WalkieTalkieProps = {
  cafeId: string;
  userName: string;
  userRole: string;
  userId?: string;
  variant?: "fab" | "inline";
  triggerClassName?: string;
};

type Channel = "ALL" | "KITCHEN" | "WAITER";
type MicStatus = "unknown" | "granted" | "denied" | "unsupported";

const CHANNEL_LABELS: Record<Channel, { uz: string }> = {
  ALL: { uz: "Umumiy" },
  KITCHEN: { uz: "Oshxona" },
  WAITER: { uz: "Ofitsiantlar" },
};

const FAB_POS_KEY = "kafe-walkie-fab-pos";
const FAB_SIZE = 42;
const DRAG_THRESHOLD = 8;

type FabPos = { x: number; y: number };

function readFabPos(): FabPos | null {
  try {
    const raw = localStorage.getItem(FAB_POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as FabPos;
    if (typeof p?.x === "number" && typeof p?.y === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

function defaultFabPos(): FabPos {
  if (typeof window === "undefined") return { x: 16, y: 16 };
  const mobile = window.innerWidth < 900;
  const pad = 12;
  // O'ng past — chapdagi chat FAB bilan chirmashmasin
  return {
    x: Math.max(pad, window.innerWidth - FAB_SIZE - pad),
    y: Math.max(
      pad,
      window.innerHeight - FAB_SIZE - pad - (mobile ? 24 : 16),
    ),
  };
}

function clampFabPos(x: number, y: number): FabPos {
  const pad = 8;
  // Chap tomonda chat tugmasi uchun joy qoldirish
  const minX = 72;
  const maxX = Math.max(minX, window.innerWidth - FAB_SIZE - pad);
  const maxY = Math.max(pad, window.innerHeight - FAB_SIZE - pad);
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(pad, y)),
  };
}

export function WalkieTalkieWidget({
  cafeId,
  userName,
  userRole,
  userId,
  variant = "fab",
  triggerClassName,
}: WalkieTalkieProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("ALL");
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [incomingPtt, setIncomingPtt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [micStatus, setMicStatus] = useState<MicStatus>("unknown");
  const [error, setError] = useState("");
  const [playbackGain, setPlaybackGain] = useState(PLAYBACK_GAIN_DEFAULT);
  const [mounted, setMounted] = useState(false);
  const [fabPos, setFabPos] = useState<FabPos>({ x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = readFabPos() ?? defaultFabPos();
    setFabPos(clampFabPos(saved.x, saved.y));
  }, []);

  useEffect(() => {
    function onResize() {
      setFabPos((p) => clampFabPos(p.x, p.y));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef("audio/webm");

  function isChannelTarget(payloadChannel: Channel) {
    return (
      payloadChannel === "ALL" ||
      channel === payloadChannel ||
      (payloadChannel === "KITCHEN" && userRole === "KITCHEN") ||
      (payloadChannel === "WAITER" && userRole === "WAITER")
    );
  }

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "walkie.ptt" && event.payload) {
      const payload = event.payload as {
        channel: Channel;
        senderId: string;
        senderName: string;
      };
      if (payload.senderId === userId) return;
      if (!isChannelTarget(payload.channel) || isMutedRef.current) return;

      setIncomingPtt(payload.senderName);
      void playWalkiePttBeep(audioContextRef, playbackGain).finally(() => {
        window.setTimeout(() => {
          setIncomingPtt((name) => (name === payload.senderName ? null : name));
        }, 1200);
      });
      return;
    }

    if (event.type === "walkie.talkie" && event.payload) {
      const payload = event.payload as {
        channel: Channel;
        audio: string;
        mimeType?: string;
        senderId: string;
        senderName: string;
        senderRole: string;
      };

      if (payload.senderId === userId) return;
      if (!isChannelTarget(payload.channel) || isMutedRef.current) return;

      setIncomingPtt(null);
      void playIncomingAudio(payload.audio, payload.mimeType ?? "audio/webm", payload.senderName);
    }
  });

  const playIncomingAudio = async (base64Audio: string, mimeType: string, senderName: string) => {
    try {
      setIsPlaying(senderName);
      await playWalkieAudio(base64Audio, mimeType, playbackGain, audioContextRef);
    } catch (e) {
      console.error("Error playing audio:", e);
    } finally {
      setIsPlaying(null);
    }
  };

  const requestMicrophone = async (): Promise<MediaStream | null> => {
    const envError = getMicEnvironmentError();
    if (envError) {
      setMicStatus("unsupported");
      setError(envError);
      return null;
    }

    if (typeof MediaRecorder === "undefined") {
      setMicStatus("unsupported");
      setError("Brauzeringiz ovoz yozishni qo'llab-quvvatlamaydi. Chrome yoki Safari yangilang.");
      return null;
    }

    try {
      const stream = await requestMicStream();
      setMicStatus("granted");
      setError("");
      return stream;
    } catch (e) {
      console.error("Microphone permission error:", e);
      const msg = micErrorMessage(e);
      setMicStatus(msg.includes("HTTPS") ? "unsupported" : "denied");
      setError(msg);
      return null;
    }
  };

  const signalPtt = async () => {
    try {
      await fetch(`/api/cafes/${cafeId}/walkie-talkie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "ptt",
          channel,
          senderName: userName,
          senderRole: userRole,
        }),
      });
    } catch {
      /* PTT signali ixtiyoriy — yozish davom etadi */
    }
  };

  const startRecording = async () => {
    if (isRecording || loading) return;

    setError("");
    audioChunksRef.current = [];

    try {
      let stream = streamRef.current;
      if (!stream || !stream.active) {
        stream = await requestMicrophone();
        if (!stream) return;
        streamRef.current = stream;
      }

      // Boshqa xodimlarga: kimdir gapirmoqchi (ratsiya ochilish ovozi)
      void signalPtt();
      void playWalkiePttBeep(audioContextRef, playbackGain);

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType || "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, getRecorderOptions(mimeType));
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blobType = mimeTypeRef.current;
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        if (audioBlob.size > 0) {
          await sendAudioMessage(audioBlob, blobType);
        }
      };

      // 250ms chunks — clearer short push-to-talk bursts
      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (e) {
      console.error("Error starting recording:", e);
      setError(micErrorMessage(e));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (blob: Blob, mimeType: string) => {
    setLoading(true);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = () => reject(new Error("Audio o'qib bo'lmadi"));
        reader.readAsDataURL(blob);
      });

      if (!base64Audio) return;

      const res = await fetch(`/api/cafes/${cafeId}/walkie-talkie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          audio: base64Audio,
          mimeType,
          senderName: userName,
          senderRole: userRole,
        }),
      });

      if (!res.ok) {
        setError("Ovoz yuborilmadi. Qayta urinib ko'ring.");
      }
    } catch (e) {
      console.error("Error sending audio:", e);
      setError("Ovoz yuborilmadi. Internet aloqasini tekshiring.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMic = async () => {
    setError("");
    const stream = await requestMicrophone();
    if (stream) {
      streamRef.current = stream;
    }
  };

  function onFabPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      origX: fabPos.x,
      origY: fabPos.y,
      pointerId: e.pointerId,
    };
  }

  function onFabPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d?.active || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setDragging(true);
    setFabPos(clampFabPos(d.origX + dx, d.origY + dy));
  }

  function onFabPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const wasDrag = d.moved;
    dragRef.current = null;
    setDragging(false);
    if (wasDrag) {
      setFabPos((p) => {
        const next = clampFabPos(p.x, p.y);
        localStorage.setItem(FAB_POS_KEY, JSON.stringify(next));
        return next;
      });
      return;
    }
    if (audioContextRef.current?.state === "suspended") {
      void audioContextRef.current.resume();
    }
    setIsOpen(true);
  }

  function resetFabPos() {
    const next = defaultFabPos();
    setFabPos(next);
    localStorage.setItem(FAB_POS_KEY, JSON.stringify(next));
  }

  const micBlocked = micStatus === "denied" || micStatus === "unsupported";

  if (!mounted) return null;

  const panelStyle: CSSProperties = (() => {
    const spaceAbove = fabPos.y;
    const spaceBelow = window.innerHeight - fabPos.y - FAB_SIZE;
    const preferAbove = spaceAbove >= 280 || spaceAbove >= spaceBelow;
    const left = Math.min(
      Math.max(12, fabPos.x + FAB_SIZE - 320),
      Math.max(12, window.innerWidth - 320 - 12),
    );
    if (preferAbove) {
      return {
        left: window.innerWidth < 900 ? 12 : left,
        right: window.innerWidth < 900 ? 12 : "auto",
        bottom: window.innerHeight - fabPos.y + 10,
        top: "auto",
        width: window.innerWidth < 900 ? "auto" : "20rem",
      };
    }
    return {
      left: window.innerWidth < 900 ? 12 : left,
      right: window.innerWidth < 900 ? 12 : "auto",
      top: fabPos.y + FAB_SIZE + 10,
      bottom: "auto",
      width: window.innerWidth < 900 ? "auto" : "20rem",
    };
  })();

  const inlinePanelStyle: CSSProperties = {
    left: "50%",
    right: "auto",
    bottom: 24,
    top: "auto",
    transform: "translateX(-50%)",
    width: "min(100vw - 1.5rem, 20rem)",
  };

  const walkiePanel = isOpen ? (
        <>
        <div
          className="fixed inset-0 z-[99] bg-black/35 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
        <div
          className="walkie-panel fixed z-[100] max-h-[min(88dvh,36rem)] overflow-y-auto overscroll-contain rounded-2xl border border-stone-100 bg-white p-5 shadow-2xl animate-in fade-in duration-200 dark:border-stone-800 dark:bg-stone-900"
          style={
            variant === "inline"
              ? inlinePanelStyle
              : {
                  left: "50%",
                  top: "50%",
                  right: "auto",
                  bottom: "auto",
                  transform: "translate(-50%, -50%)",
                  width: "min(100vw - 1.5rem, 22rem)",
                  paddingTop: "max(1.25rem, env(safe-area-inset-top))",
                }
          }
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-[1] -mx-1 mb-4 flex items-center justify-between border-b bg-white/95 pb-3 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-amber-600" />
              <h3 className="font-bold text-stone-900 dark:text-white">Ratsiya</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`rounded-lg p-2 transition ${isMuted ? "text-red-500 bg-red-50 dark:bg-red-950/20" : "text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"}`}
                title={isMuted ? "Ovozni yoqish" : "Ovozsiz rejim"}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {variant === "fab" && (
            <p className="mb-3 text-[11px] text-stone-500 dark:text-stone-400">
              Tugmani ushlab surib joyini o&apos;zgartiring.{" "}
              <button
                type="button"
                onClick={resetFabPos}
                className="font-semibold text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
              >
                Joyini tiklash
              </button>
            </p>
          )}

          <div className="space-y-1.5 mb-4">
            <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Kanal tanlang</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["ALL", "KITCHEN", "WAITER"] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannel(ch)}
                  className={`rounded-xl py-2 text-xs font-bold transition-all ${
                    channel === ch
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  {CHANNEL_LABELS[ch].uz}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                Ovoz balandligi
              </label>
              <span className="text-[10px] font-bold text-amber-600">{playbackGain.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={4}
              step={0.1}
              value={playbackGain}
              onChange={(e) => setPlaybackGain(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {micStatus === "granted" && !error && (
            <p className="mb-4 text-center text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Mikrofon tayyor
            </p>
          )}

          <div className="flex flex-col items-center justify-center py-6 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800/60 mb-5 relative overflow-hidden">
            {incomingPtt && !isPlaying && !isRecording ? (
              <div className="flex flex-col items-center gap-2 text-center animate-pulse">
                <Radio className="h-10 w-10 text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Gapirmoqchi...
                  </p>
                  <p className="mt-0.5 text-sm font-black text-stone-800 dark:text-white">
                    {incomingPtt}
                  </p>
                </div>
              </div>
            ) : isPlaying ? (
              <div className="flex flex-col items-center gap-2 text-center animate-pulse">
                <Volume2 className="h-10 w-10 text-emerald-500" />
                <div>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Eshityapman...</p>
                  <p className="text-sm font-black text-stone-800 dark:text-white mt-0.5">{isPlaying}</p>
                </div>
              </div>
            ) : isRecording ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <Mic className="h-10 w-10 text-red-500 relative" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider animate-pulse">Gapiring...</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Kanal: {CHANNEL_LABELS[channel].uz}</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <Loader2 className="h-10 w-10 text-amber-600 animate-spin" />
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Yuborilmoqda...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-stone-400 dark:text-stone-500">
                <Radio className="h-10 w-10" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Kutish rejimi</p>
                  <p className="text-[10px] mt-0.5">Kanal: {CHANNEL_LABELS[channel].uz}</p>
                </div>
              </div>
            )}
          </div>

          {micBlocked ? (
            <button
              type="button"
              onClick={handleEnableMic}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-700 transition"
            >
              <Mic className="h-4 w-4" />
              Mikrofonga ruxsat berish
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <button
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={(e) => {
                  e.preventDefault();
                  void startRecording();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopRecording();
                }}
                onTouchCancel={(e) => {
                  e.preventDefault();
                  stopRecording();
                }}
                style={{ touchAction: "none" }}
                className={`flex h-20 w-20 items-center justify-center rounded-full shadow-md transition-all duration-150 ${
                  isRecording
                    ? "bg-red-600 text-white scale-95 shadow-inner"
                    : "bg-amber-600 text-white hover:bg-amber-700 hover:scale-105 active:scale-95"
                }`}
              >
                <Mic className="h-8 w-8" />
              </button>
              <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mt-1 text-center">
                {isRecording ? "Yuborish uchun qo'yib yuboring" : "Bosib turib gapiring"}
              </p>
            </div>
          )}
        </div>
        </>
  ) : null;

  if (variant === "inline") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className={
            triggerClassName ??
            "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border"
          }
          title="Ratsiya"
          aria-label="Ratsiya"
        >
          <Mic className={`h-4 w-4 sm:h-5 sm:w-5 ${isPlaying ? "animate-pulse" : ""}`} />
          {isPlaying && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
          )}
        </button>
        {mounted && walkiePanel
          ? createPortal(walkiePanel, document.body)
          : null}
      </>
    );
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={onFabPointerUp}
        onPointerCancel={onFabPointerUp}
        className={`walkie-fab fixed z-[90] flex h-[42px] w-[42px] items-center justify-center rounded-full bg-amber-600 text-white shadow-lg transition-colors hover:bg-amber-700 ${
          dragging ? "cursor-grabbing scale-105" : "cursor-grab"
        }`}
        style={{
          left: fabPos.x,
          top: fabPos.y,
          right: "auto",
          bottom: "auto",
          touchAction: "none",
        }}
        title="Ratsiya — ushlab suring"
        aria-label="Ratsiya"
      >
        <Mic className={`h-5 w-5 ${isPlaying ? "animate-pulse" : ""}`} />
        {isPlaying && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500" />
          </span>
        )}
      </button>
      {walkiePanel}
    </>,
    document.body,
  );
}
