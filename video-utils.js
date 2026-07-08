// Shared video + notification helpers (popup + content script).
// Videos stored as base64 in chrome.storage.local.

const WA_DEBUG = true;

function waLog(...args) {
  if (WA_DEBUG) console.log("[WA Themes]", ...args);
}

function waError(...args) {
  console.error("[WA Themes]", ...args);
}

const activeObjectUrls = {};

function cacheKey(slot, storageKey) {
  return `${slot || "default"}::${storageKey}`;
}

function getCachedObjectUrl(slot, storageKey) {
  return activeObjectUrls[cacheKey(slot, storageKey)] || null;
}

function setCachedObjectUrl(slot, storageKey, url) {
  const ck = cacheKey(slot, storageKey);
  if (activeObjectUrls[ck] && activeObjectUrls[ck] !== url) {
    URL.revokeObjectURL(activeObjectUrls[ck]);
  }
  activeObjectUrls[ck] = url;
}

function revokeCachedObjectUrl(slot, storageKey) {
  const ck = cacheKey(slot, storageKey);
  if (activeObjectUrls[ck]) {
    URL.revokeObjectURL(activeObjectUrls[ck]);
    delete activeObjectUrls[ck];
  }
}

function revokeAllSlotsForKey(storageKey) {
  for (const ck of Object.keys(activeObjectUrls)) {
    if (ck.endsWith(`::${storageKey}`)) {
      URL.revokeObjectURL(activeObjectUrls[ck]);
      delete activeObjectUrls[ck];
    }
  }
}

function base64ToBlob(dataUrl, fallbackMime = "video/mp4") {
  waLog("Converting base64 to blob");
  const parts = dataUrl.split(",");
  const mime = (parts[0].match(/:(.*?);/) || [])[1] || fallbackMime;
  const bstr = atob(parts[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

async function getVideoObjectUrl(storageKey, slot = "default") {
  const cached = getCachedObjectUrl(slot, storageKey);
  if (cached) {
    waLog("Using cached object URL for", slot, storageKey);
    return cached;
  }

  try {
    waLog("Retrieving video from storage for", slot, storageKey);
    const result = await chrome.storage.local.get(storageKey);
    const data = result[storageKey];
    if (!data) {
      waError("Video not found for key:", storageKey);
      return null;
    }
    const dataUrl = data.__waVideo ? `data:${data.mime};base64,${data.b64}` : data;
    const blob = base64ToBlob(dataUrl, data.mime || "video/mp4");
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    setCachedObjectUrl(slot, storageKey, url);
    waLog("Created new object URL", slot, storageKey, "size=", blob.size);
    return url;
  } catch (e) {
    waError("getVideoObjectUrl failed:", slot, storageKey, e);
    return null;
  }
}

async function readFileAsDataURL(file) {
  waLog("Reading file as data URL:", file?.name);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function saveVideoToStorage(key, file) {
  waLog("saveVideoToStorage start", { key, name: file?.name, size: file?.size, type: file?.type });
  if (!file || !file.size) throw new Error("Video file is empty");

  const dataUrl = await readFileAsDataURL(file);
  const mime = file.type || "video/mp4";
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;

  await chrome.storage.local.set({
    [key]: { __waVideo: true, mime, b64, savedAt: Date.now() }
  });
  waLog("saveVideoToStorage OK", { key, bytes: b64.length });
}

async function saveVideoBase64ToStorage(key, dataUrlOrB64, mime = "video/mp4") {
  waLog("saveVideoBase64ToStorage start", { key, mime });
  let b64 = dataUrlOrB64;
  let outMime = mime;
  if (typeof dataUrlOrB64 === "string" && dataUrlOrB64.startsWith("data:")) {
    const comma = dataUrlOrB64.indexOf(",");
    b64 = comma >= 0 ? dataUrlOrB64.slice(comma + 1) : dataUrlOrB64;
    const m = dataUrlOrB64.match(/^data:([^;]+);/);
    if (m) outMime = m[1];
  }
  await chrome.storage.local.set({
    [key]: { __waVideo: true, mime: outMime, b64, savedAt: Date.now() }
  });
  waLog("saveVideoBase64ToStorage OK", { key, bytes: b64.length });
}

async function deleteVideoFromStorage(key) {
  if (!key) return;
  waLog("deleteVideoFromStorage", key);
  await chrome.storage.local.remove(key).catch(() => {});
  revokeAllSlotsForKey(key);
}

async function notifyWhatsAppTabs(message = { type: "SETTINGS_UPDATED" }) {
  waLog("Notifying WhatsApp tabs");
  const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
  await Promise.allSettled(
    tabs.map(tab => chrome.tabs.sendMessage(tab.id, message))
  );
  waLog(`Notified ${tabs.length} tab(s)`);
  return tabs.length;
}
