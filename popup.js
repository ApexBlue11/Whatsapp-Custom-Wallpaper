// =============================================================================
// WhatsApp Themes - popup.js
// =============================================================================

const DEFAULTS = {
  enabled:               true,
  outBubbleColor:        "#144d37",
  outBubbleOpacity:      100,
  blurOutBubble:         false,
  inBubbleColor:         "#242626",
  inBubbleOpacity:       100,
  blurInBubble:          false,
  blurIntensity:         8,
  fontFamily:            "",
  fontSize:              14,
  headerColor:           "#202c33",
  convHeaderOpacity:     100,
  convHeaderBlur:        0,
  chatlistHeaderColor:   "#202c33",
  chatlistHeaderOpacity: 100,
  chatlistHeaderBlur:    0,
  globalWallpaper:       null,
  sidebarWallpaper:      null,
  sidebarTintColor:      "#111b21",
  sidebarTintOpacity:    0,
  blurSidebar:           false,
  sidebarBlurIntensity:  8,
  sidebarColor:          "#111b21",
  chatCardBgColor:       "#1d1f1f",
  chatCardOpacity:       100,
  chatCardBlur:          false,
  chatCardBlurIntensity: 4,
  navStripColor:         "#202c33",
  navStripOpacity:       100,
  navStripBlur:          0,
};

let settings = { ...DEFAULTS };
let chatSettings = {};

let pendingGlobalWp = null;
let pendingSidebarWp = null;

const popupObjectUrls = [];

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[WA Themes] Popup opened");
  await loadAll();
  await renderSettings();
  setupTabs();
  setupListeners();
  loadCurrentChat();
  renderChatList();
  console.log("[WA Themes] Popup initialized");
});

window.addEventListener("unload", () => {
  console.log("[WA Themes] Popup closing, revoking object URLs");
  popupObjectUrls.forEach((u) => URL.revokeObjectURL(u));
});

async function loadAll() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["globalSettings", "chatWallpapers"], (result) => {
      settings = Object.assign({ ...DEFAULTS }, result.globalSettings || {});
      chatSettings = result.chatWallpapers || {};
      console.log("[WA Themes] Loaded settings from storage:", {
        hasGlobalSettings: !!result.globalSettings,
        hasChatSettings: !!result.chatWallpapers,
      });
      resolve();
    });
  });
}

async function saveSettings() {
  console.log("[WA Themes] Saving global settings");
  await chrome.storage.local.set({ globalSettings: settings });
}

async function saveChatSettings() {
  console.log("[WA Themes] Saving chat settings");
  await chrome.storage.local.set({ chatWallpapers: chatSettings });
}

function makeAndTrackObjectUrl(blob) {
  const url = URL.createObjectURL(blob);
  popupObjectUrls.push(url);
  console.log("[WA Themes] Created and tracked object URL");
  return url;
}

function base64ToBlob(dataUrl, fallbackMime = "video/mp4") {
  const parts = dataUrl.split(",");
  const mime = (parts[0].match(/:(.*?);/) || [])[1] || fallbackMime;
  const bstr = atob(parts[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function renderSettings() {
  console.log("[WA Themes] Rendering settings");
  const s = settings;
  chk("enabled", s.enabled !== false);
  val("outBubbleColor", s.outBubbleColor || DEFAULTS.outBubbleColor);
  rng("outBubbleOpacity", s.outBubbleOpacity ?? 100, "outOpacityVal", "%");
  chk("blurOutBubble", s.blurOutBubble ?? false);
  val("inBubbleColor", s.inBubbleColor || DEFAULTS.inBubbleColor);
  rng("inBubbleOpacity", s.inBubbleOpacity ?? 100, "inOpacityVal", "%");
  chk("blurInBubble", s.blurInBubble ?? false);
  rng("blurIntensity", s.blurIntensity ?? 8, "blurVal", "px");
  val("fontFamily", s.fontFamily || "");
  rng("fontSize", s.fontSize ?? 14, "fontSizeVal", "px");

  val("headerColor", s.headerColor || DEFAULTS.headerColor);
  rng("convHeaderOpacity", s.convHeaderOpacity ?? 100, "convHeaderOpacityVal", "%");
  rng("convHeaderBlur", s.convHeaderBlur ?? 0, "convHeaderBlurVal", "px");

  val("chatlistHeaderColor", s.chatlistHeaderColor || DEFAULTS.chatlistHeaderColor);
  rng("chatlistHeaderOpacity", s.chatlistHeaderOpacity ?? 100, "chatlistHeaderOpacityVal", "%");
  rng("chatlistHeaderBlur", s.chatlistHeaderBlur ?? 0, "chatlistHeaderBlurVal", "px");

  val("sidebarTintColor", s.sidebarTintColor || DEFAULTS.sidebarTintColor);
  rng("sidebarTintOpacity", s.sidebarTintOpacity ?? 0, "sidebarTintVal", "%");
  chk("blurSidebar", s.blurSidebar ?? false);
  rng("sidebarBlurIntensity", s.sidebarBlurIntensity ?? 8, "sidebarBlurVal", "px");
  val("sidebarColor", s.sidebarColor || DEFAULTS.sidebarColor);
  val("chatCardBgColor", s.chatCardBgColor || DEFAULTS.chatCardBgColor);
  rng("chatCardOpacity", s.chatCardOpacity ?? 100, "chatCardOpacityVal", "%");
  chk("chatCardBlur", s.chatCardBlur ?? false);
  rng("chatCardBlurIntensity", s.chatCardBlurIntensity ?? 4, "chatCardBlurIntensityVal", "px");
  val("navStripColor", s.navStripColor || DEFAULTS.navStripColor);
  rng("navStripOpacity", s.navStripOpacity ?? 100, "navStripOpacityVal", "%");
  rng("navStripBlur", s.navStripBlur ?? 0, "navStripBlurVal", "px");
  chk("globalWpBlur", s.globalWallpaper?.blur ?? false);

  if (s.globalWallpaper) {
    if (s.globalWallpaper.type === "video") {
      const blob = base64ToBlob(s.globalWallpaper.data);
      const url = makeAndTrackObjectUrl(blob);
      renderPreview("global-wp-preview", "global-wp-placeholder", { type: "video", data: url });
    } else {
      renderPreview("global-wp-preview", "global-wp-placeholder", s.globalWallpaper);
    }
  } else {
    clearPreview("global-wp-preview", "global-wp-placeholder", "No wallpaper set");
  }

  if (s.sidebarWallpaper) {
    if (s.sidebarWallpaper.type === "video") {
      const blob = base64ToBlob(s.sidebarWallpaper.data);
      const url = makeAndTrackObjectUrl(blob);
      renderPreview("sidebar-wp-preview", "sidebar-wp-placeholder", { type: "video", data: url });
    } else {
      renderPreview("sidebar-wp-preview", "sidebar-wp-placeholder", s.sidebarWallpaper);
    }
  } else {
    clearPreview("sidebar-wp-preview", "sidebar-wp-placeholder", "No wallpaper set");
  }
}

function readSettingsFromUI() {
  console.log("[WA Themes] Reading settings from UI");
  const wpBlur = g("globalWpBlur").checked;

  let globalWallpaper = settings.globalWallpaper || null;
  if (pendingGlobalWp?.type === "__removed__") {
    globalWallpaper = null;
  } else if (pendingGlobalWp?.type) {
    globalWallpaper = { ...pendingGlobalWp, blur: wpBlur };
  } else if (globalWallpaper) {
    globalWallpaper = { ...globalWallpaper, blur: wpBlur };
  }

  let sidebarWallpaper = settings.sidebarWallpaper || null;
  if (pendingSidebarWp?.type === "__removed__") {
    sidebarWallpaper = null;
  } else if (pendingSidebarWp?.type) {
    sidebarWallpaper = { ...pendingSidebarWp };
  }

  return {
    enabled: g("enabled").checked,
    outBubbleColor: getVal("outBubbleColor"),
    outBubbleOpacity: parseInt(getVal("outBubbleOpacity")),
    blurOutBubble: g("blurOutBubble").checked,
    inBubbleColor: getVal("inBubbleColor"),
    inBubbleOpacity: parseInt(getVal("inBubbleOpacity")),
    blurInBubble: g("blurInBubble").checked,
    blurIntensity: parseInt(getVal("blurIntensity")),
    fontFamily: getVal("fontFamily"),
    fontSize: parseInt(getVal("fontSize")),
    headerColor: getVal("headerColor"),
    convHeaderOpacity: parseInt(getVal("convHeaderOpacity")),
    convHeaderBlur: parseInt(getVal("convHeaderBlur")),
    chatlistHeaderColor: getVal("chatlistHeaderColor"),
    chatlistHeaderOpacity: parseInt(getVal("chatlistHeaderOpacity")),
    chatlistHeaderBlur: parseInt(getVal("chatlistHeaderBlur")),
    globalWallpaper,
    sidebarWallpaper,
    sidebarTintColor: getVal("sidebarTintColor"),
    sidebarTintOpacity: parseInt(getVal("sidebarTintOpacity")),
    blurSidebar: g("blurSidebar").checked,
    sidebarBlurIntensity: parseInt(getVal("sidebarBlurIntensity")),
    sidebarColor: getVal("sidebarColor"),
    chatCardBgColor: getVal("chatCardBgColor"),
    chatCardOpacity: parseInt(getVal("chatCardOpacity")),
    chatCardBlur: getBool("chatCardBlur"),
    chatCardBlurIntensity: parseInt(getVal("chatCardBlurIntensity")),
    navStripColor: getVal("navStripColor"),
    navStripOpacity: parseInt(getVal("navStripOpacity")),
    navStripBlur: parseInt(getVal("navStripBlur")),
  };
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      g(`tab-${tab.dataset.tab}`).classList.add("active");
      if (tab.dataset.tab === "chats") {
        loadCurrentChat();
        renderChatList();
      }
    });
  });
}

function setupListeners() {
  console.log("[WA Themes] Setting up listeners");
  liveRange("outBubbleOpacity", "outOpacityVal");
  liveRange("inBubbleOpacity", "inOpacityVal");
  liveRange("blurIntensity", "blurVal");
  liveRange("sidebarTintOpacity", "sidebarTintVal");
  liveRange("sidebarBlurIntensity", "sidebarBlurVal");
  liveRange("chatCardOpacity", "chatCardOpacityVal");
  liveRange("chatCardBlurIntensity", "chatCardBlurIntensityVal");
  liveRange("navStripOpacity", "navStripOpacityVal");
  liveRange("navStripBlur", "navStripBlurVal");
  liveRange("fontSize", "fontSizeVal");

  liveRange("convHeaderOpacity", "convHeaderOpacityVal");
  liveRange("convHeaderBlur", "convHeaderBlurVal");
  liveRange("chatlistHeaderOpacity", "chatlistHeaderOpacityVal");
  liveRange("chatlistHeaderBlur", "chatlistHeaderBlurVal");

  document.querySelectorAll(".reset-btn").forEach((btn) => {
    btn.addEventListener("click", () => val(btn.dataset.target, btn.dataset.default || ""));
  });

  g("wa-global-btn-img").addEventListener("click", () => g("wa-global-file-img").click());
  g("wa-global-btn-vid").addEventListener("click", () => g("wa-global-file-vid").click());
  g("wa-global-file-img").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    readFileAsDataURL(f).then((data) => {
      pendingGlobalWp = { type: "image", data };
      renderPreview("global-wp-preview", "global-wp-placeholder", { type: "image", data });
    });
  });
  g("wa-global-file-vid").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    readFileAsDataURL(f).then((data) => {
      const blob = base64ToBlob(data);
      const url = makeAndTrackObjectUrl(blob);
      pendingGlobalWp = { type: "video", data };
      renderPreview("global-wp-preview", "global-wp-placeholder", { type: "video", data: url });
    });
  });
  g("wa-global-btn-remove").addEventListener("click", () => {
    pendingGlobalWp = { type: "__removed__" };
    clearPreview("global-wp-preview", "global-wp-placeholder", "No wallpaper set");
  });

  g("wa-sidebar-btn-img").addEventListener("click", () => g("wa-sidebar-file-img").click());
  g("wa-sidebar-btn-vid").addEventListener("click", () => g("wa-sidebar-file-vid").click());
  g("wa-sidebar-file-img").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    readFileAsDataURL(f).then((data) => {
      pendingSidebarWp = { type: "image", data };
      renderPreview("sidebar-wp-preview", "sidebar-wp-placeholder", { type: "image", data });
    });
  });
  g("wa-sidebar-file-vid").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    readFileAsDataURL(f).then((data) => {
      const blob = base64ToBlob(data);
      const url = makeAndTrackObjectUrl(blob);
      pendingSidebarWp = { type: "video", data };
      renderPreview("sidebar-wp-preview", "sidebar-wp-placeholder", { type: "video", data: url });
    });
  });
  g("wa-sidebar-btn-remove").addEventListener("click", () => {
    pendingSidebarWp = { type: "__removed__" };
    clearPreview("sidebar-wp-preview", "sidebar-wp-placeholder", "No wallpaper set");
  });

  g("applyBtn").addEventListener("click", applyAndNotify);
  g("resetAllBtn").addEventListener("click", async () => {
    settings = { ...DEFAULTS };
    pendingGlobalWp = null;
    pendingSidebarWp = null;
    await renderSettings();
    await applyAndNotify();
  });
}

async function applyAndNotify() {
  console.log("[WA Themes] Applying and notifying");
  settings = readSettingsFromUI();
  pendingGlobalWp = null;
  pendingSidebarWp = null;

  try {
    await saveSettings();
    const tabCount = await notifyWhatsAppTabs();
    console.log(`[WA Themes] Applied successfully, notified ${tabCount} tabs`);
    showPopupStatus(tabCount ? "✓ Applied!" : "✓ Saved (open WhatsApp Web)", false);
  } catch (e) {
    console.error("[WA Themes] Save/notify failed:", e);
    showPopupStatus("Save failed: " + (e.message || e), true);
  }
}

function showPopupStatus(text, isError) {
  const btn = g("applyBtn");
  btn.textContent = text;
  btn.classList.toggle("success", !isError);
  btn.style.background = isError ? "#ea0038" : "";
  setTimeout(() => {
    btn.textContent = "Apply Changes";
    btn.classList.remove("success");
    btn.style.background = "";
  }, 1800);
}

async function notifyContentScript() {
  return notifyWhatsAppTabs();
}

async function loadCurrentChat() {
  const label = g("currentChatLabel");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error();
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_CURRENT_CHAT" });
    label.textContent = res?.chatName || "—";
  } catch {
    label.textContent = "Open WhatsApp Web first";
  }
}

function renderChatList() {
  console.log("[WA Themes] Rendering chat list");
  const container = g("chat-list-container");
  const entries = Object.entries(chatSettings);

  if (!entries.length) {
    container.innerHTML = `
      <div class="empty-msg">
        No per-chat settings saved yet.<br>
        <span class="hint">Open a chat → click ⋮ → Chat Wallpaper</span>
      </div>`;
    return;
  }

  container.innerHTML = "";
  entries.forEach(([chatName, cs]) => {
    const item = document.createElement("div");
    item.className = "chat-item";

    const header = document.createElement("div");
    header.className = "chat-item-header";

    const hasWp = cs.wallpaperType && cs.wallpaperData;
    let thumb;
    if (hasWp && cs.wallpaperType === "image" && cs.wallpaperData) {
      thumb = document.createElement("img");
      thumb.src = cs.wallpaperData;
    } else if (hasWp && cs.wallpaperType === "video") {
      thumb = document.createElement("div");
      thumb.style.cssText = "display:flex;align-items:center;justify-content:center;font-size:18px;";
      thumb.textContent = "🎬";
    } else {
      thumb = document.createElement("div");
      thumb.style.cssText = "display:flex;align-items:center;justify-content:center;font-size:18px;";
      thumb.textContent = "💬";
    }
    thumb.className = "chat-item-thumb";

    const name = document.createElement("div");
    name.className = "chat-item-name";
    name.textContent = chatName;

    const del = document.createElement("button");
    del.className = "chat-item-del";
    del.title = "Delete all settings for this chat";
    del.textContent = "✕";
    del.addEventListener("click", async () => {
      delete chatSettings[chatName];
      await saveChatSettings();
      await notifyWhatsAppTabs();
      renderChatList();
    });

    header.append(thumb, name, del);

    const tags = document.createElement("div");
    tags.className = "chat-item-tags";

    if (hasWp) {
      const t = document.createElement("span");
      t.className = "tag wp";
      t.textContent = cs.wallpaperType === "video" ? "🎬 Wallpaper" : "📷 Wallpaper";
      tags.appendChild(t);
    }
    if (cs.wallpaperBlur) {
      const t = document.createElement("span");
      t.className = "tag blur";
      t.textContent = "✨ Blur";
      tags.appendChild(t);
    }
    if (cs.outBubbleColor) {
      const t = document.createElement("span");
      t.className = "tag out";
      t.style.cssText = `color:${cs.outBubbleColor};border-color:${cs.outBubbleColor};background:${hexToRgba(cs.outBubbleColor, 0.15)};`;
      t.textContent = `↑ ${Math.round(cs.outBubbleOpacity ?? 100)}%${cs.blurOutBubble ? " blur" : ""}`;
      tags.appendChild(t);
    }
    if (cs.inBubbleColor) {
      const t = document.createElement("span");
      t.className = "tag in";
      t.style.cssText = `color:${cs.inBubbleColor};border-color:${cs.inBubbleColor};background:${hexToRgba(cs.inBubbleColor, 0.15)};`;
      t.textContent = `↓ ${Math.round(cs.inBubbleOpacity ?? 100)}%${cs.blurInBubble ? " blur" : ""}`;
      tags.appendChild(t);
    }

    item.append(header, tags);
    container.appendChild(item);
  });
}

function renderPreview(previewId, placeholderId, wp) {
  const el = g(previewId);
  el.innerHTML = "";
  if (wp.type === "video") {
    const v = document.createElement("video");
    v.src = wp.data;
    v.autoplay = true;
    v.loop = true;
    v.muted = true;
    v.style.cssText = "width:100%;height:100%;object-fit:cover;";
    el.appendChild(v);
  } else {
    const img = document.createElement("img");
    img.src = wp.data;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    el.appendChild(img);
  }
}

function clearPreview(previewId, placeholderId, text) {
  g(previewId).innerHTML = `<span id="${placeholderId}">${text}</span>`;
}

function g(id) { return document.getElementById(id); }
function getVal(id) { return g(id)?.value ?? ""; }
function getBool(id) { return g(id)?.checked ?? false; }
function val(id, v) { if (g(id)) g(id).value = v; }
function chk(id, v) { if (g(id)) g(id).checked = v; }
function rng(id, v, labelId, suffix = "") {
  val(id, v);
  if (labelId && g(labelId)) g(labelId).textContent = v + suffix;
}
function liveRange(rangeId, labelId) {
  const el = g(rangeId);
  if (!el) return;
  el.addEventListener("input", (e) => {
    if (g(labelId)) g(labelId).textContent = e.target.value;
  });
}
function hexToRgba(hex, a) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16);
  const gg = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${gg},${b},${a})`;
}
