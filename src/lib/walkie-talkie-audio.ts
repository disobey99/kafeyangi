/** Walkie-talkie audio helpers — mobile-friendly mic access and loud playback */

export const PLAYBACK_GAIN_DEFAULT = 3;
export const RECORD_BITRATE = 128000;

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Legacy getUserMedia polyfill for older mobile browsers */
export function ensureMediaDevices(): boolean {
  if (typeof navigator === "undefined") return false;

  if (!navigator.mediaDevices) {
    (navigator as Navigator & { mediaDevices?: MediaDevices }).mediaDevices = {} as MediaDevices;
  }

  if (!navigator.mediaDevices.getUserMedia) {
    const legacy =
      (navigator as Navigator & { webkitGetUserMedia?: typeof navigator.mediaDevices.getUserMedia })
        .webkitGetUserMedia ||
      (navigator as Navigator & { mozGetUserMedia?: typeof navigator.mediaDevices.getUserMedia })
        .mozGetUserMedia ||
      (navigator as Navigator & { getUserMedia?: typeof navigator.mediaDevices.getUserMedia })
        .getUserMedia;

    if (legacy) {
      navigator.mediaDevices.getUserMedia = (constraints) =>
        new Promise((resolve, reject) => (legacy as any).call(navigator, constraints, resolve, reject));
    }
  }

  return typeof navigator.mediaDevices?.getUserMedia === "function";
}

export function getMicEnvironmentError(): string | null {
  if (typeof window === "undefined") return "Brauzer muhiti topilmadi.";

  const host = window.location.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1";
  const isPrivateIp = /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(host);

  if (!window.isSecureContext && !isLocalhost) {
    if (isPrivateIp && isMobile()) {
      return "Telefondan mikrofon uchun HTTPS kerak. Saytni https:// manzil orqali oching (masalan, ngrok yoki SSL sertifikat).";
    }
    return "Mikrofon faqat HTTPS yoki localhost orqali ishlaydi.";
  }

  if (!ensureMediaDevices()) {
    return "Brauzeringiz mikrofonni qo'llab-quvvatlamaydi. Chrome yoki Safari dan foydalaning.";
  }

  return null;
}

export function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";

  const iosFirst = isIos();
  const types = iosFirst
    ? ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/aac"];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function getRecorderOptions(mimeType: string): MediaRecorderOptions {
  const options: MediaRecorderOptions = { audioBitsPerSecond: RECORD_BITRATE };
  if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
    options.mimeType = mimeType;
  }
  return options;
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  return new Blob([base64ToArrayBuffer(base64)], { type: mimeType || "audio/webm" });
}

export async function requestMicStream(): Promise<MediaStream> {
  const envError = getMicEnvironmentError();
  if (envError) throw new Error(envError);

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: { ideal: 48000 },
    },
  });
}

export function micErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("HTTPS")) {
    return error.message;
  }
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.";
    }
    if (error.name === "NotFoundError") {
      return "Mikrofon topilmadi. Qurilmangizda mikrofon borligini tekshiring.";
    }
    if (error.name === "NotReadableError") {
      return "Mikrofon boshqa ilova tomonidan ishlatilmoqda.";
    }
  }
  return "Mikrofonga ulanib bo'lmadi. Qayta urinib ko'ring.";
}

/** Ratsiya PTT — klassik radio "beep-beep" (kimdir gapirmoqchi) */
export async function playWalkiePttBeep(
  audioContextRef: { current: AudioContext | null },
  gainValue = PLAYBACK_GAIN_DEFAULT,
): Promise<void> {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioCtx();
  }
  const ctx = audioContextRef.current;
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const volume = Math.min(0.4, 0.16 * Math.min(4, Math.max(1, gainValue)));
  const t0 = ctx.currentTime;

  function beep(freq: number, start: number, duration: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.setValueAtTime(vol, start + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0.001, start + duration);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  // Aniq, qisqa radio signal: ikki marta "bip"
  beep(880, t0, 0.09, volume);
  beep(1175, t0 + 0.12, 0.11, volume * 0.95);

  await new Promise((r) => setTimeout(r, 280));
}

/** Play audio with gain boost; falls back to HTML Audio for cross-format mobile playback */
export async function playWalkieAudio(
  base64Audio: string,
  mimeType: string,
  gainValue: number,
  audioContextRef: { current: AudioContext | null },
): Promise<void> {
  const blob = base64ToBlob(base64Audio, mimeType);
  const blobUrl = URL.createObjectURL(blob);
  const gain = Math.min(4, Math.max(1, gainValue));

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;

    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);

    await new Promise<void>((resolve) => {
      source.onended = () => resolve();
    });
    return;
  } catch {
    // Safari / iOS / ba'zi Android — AudioContext decode ishlamaydi
    try {
      const audio = new Audio(blobUrl);
      audio.volume = Math.min(1, 0.35 * gain);
      // iOS autoplay: play() Promise
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
    } catch (playErr) {
      console.warn("[walkie] playback failed", playErr);
    }
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
