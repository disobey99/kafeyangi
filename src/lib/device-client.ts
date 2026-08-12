const DEVICE_KEY = "kafe_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getClientDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Noma'lum qurilma";
  const ua = navigator.userAgent;
  let os = "Qurilma";
  if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Android/i.test(ua)) {
    const model = ua.match(/;\s*([^;)]+)\s+Build\//i);
    os = model?.[1]?.trim() && !/wv|Linux/i.test(model[1]) ? model[1].trim() : "Android";
  } else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "Mac";

  let browser = "Brauzer";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return `${os} · ${browser}`;
}
