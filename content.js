// =============================================================================
// WhatsApp Themes - content.js
// =============================================================================
console.log('[WA Themes] ✅ content.js loaded at', new Date().toISOString());

// ---------------------------------------------------------------------------
// SELECTORS
// ---------------------------------------------------------------------------
const SEL = {
  main: '#main',
  chatBg: '[data-testid="conversation-background-default_chat_wallpaper"]',
  chatPanel: '[data-testid="conversation-panel-body"]',
  header: '[data-testid="conversation-header"]',
  chatlistHeader: '[data-testid="chatlist-header"]',
  chatTitle: '[data-testid="conversation-info-header-chat-title"]',
  menuBtn: '[data-testid="conversation-header"] [aria-label="Menu"][data-tab="6"]',
  dropdownMenu: '[role="menu"]',
  sidebarFull: '#side',
  leftPanel: '#pane-side',
  chatList: '[data-testid="chat-list"]',
  chatListItem: '[data-testid="cell-frame-container"]',
  // Try multiple bubble selectors!
  bubbleSelectors: [
    '.message-out', '.message-in',
    'div[data-testid="msg-container"]'
  ],
  bubbleBg: '._amk6',
};

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------
let currentChatName = null;
let globalSettings = {};
let chatSettings = {};
let styleEl = null;
let bgOverlay = null;
let sidebarOverlay = null;
let menuObserver = null;
let chatObserver = null;
let bubbleObserver = null;
let chatCardObserver = null;
let sidebarContainerEl = null;

// ---------------------------------------------------------------------------
// HELPERS - WAIT FOR ELEMENTS
// ---------------------------------------------------------------------------
async function waitForElement(selector, timeout = 30000) {
  console.log(`[WA Themes] Waiting for element: ${selector}`);
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) {
      console.log(`[WA Themes] Found element immediately: ${selector}`);
      return resolve(el);
    }

    const observer = new MutationObserver((mutations, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        console.log(`[WA Themes] Found element after waiting: ${selector}`);
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      console.warn(`[WA Themes] Timed out waiting for element: ${selector}`);
      resolve(null);
    }, timeout);
  });
}

// ---------------------------------------------------------------------------
// DEFAULTS
// ---------------------------------------------------------------------------
function getDefaults() {
  console.log('[WA Themes] Loading default settings');
  return {
    enabled: true,
    outBubbleColor: '#144d37',
    outBubbleOpacity: 100,
    blurOutBubble: false,
    inBubbleColor: '#242626',
    inBubbleOpacity: 100,
    blurInBubble: false,
    blurIntensity: 8,
    fontFamily: null,
    fontSize: null,
    headerColor: '#202c33',
    convHeaderOpacity: 100,
    convHeaderBlur: 0,
    chatlistHeaderColor: '#202c33',
    chatlistHeaderOpacity: 100,
    chatlistHeaderBlur: 0,
    globalWallpaper: null,
    sidebarWallpaper: null,
    sidebarTintColor: '#111b21',
    sidebarTintOpacity: 0,
    blurSidebar: false,
    sidebarBlurIntensity: 8,
    sidebarColor: null,
    chatCardBgColor: '#1d1f1f',
    chatCardOpacity: 100,
    chatCardBlur: false,
    chatCardBlurIntensity: 4,
    navStripColor: '#202c33',
    navStripOpacity: 100,
    navStripBlur: 0,
  };
}

// ---------------------------------------------------------------------------
// UTILITY
// ---------------------------------------------------------------------------
function hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function base64ToBlob(dataUrl, fallbackMime) {
  const parts = dataUrl.split(',');
  const mime = (parts[0].match(/:(.*?);/) || [])[1] || fallbackMime;
  const bstr = atob(parts[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

// ---------------------------------------------------------------------------
// VIDEO EVENT HANDLERS
// ---------------------------------------------------------------------------
function attachVideoHandlers(videoEl, dataUrl, slot = 'default') {
  console.log(`[WA Themes] Attaching video handlers for slot: ${slot}`);
  videoEl.addEventListener('ended', () => {
    console.log(`[WA Themes] Video ended, restarting (slot: ${slot})`);
    videoEl.currentTime = 0;
    videoEl.play().catch((e) => console.warn(`[WA Themes] Video play failed (ended):`, e));
  });

  videoEl.addEventListener('stalled', () => {
    console.log(`[WA Themes] Video stalled, reloading (slot: ${slot})`);
    videoEl.load();
    videoEl.play().catch((e) => console.warn(`[WA Themes] Video play failed (stalled):`, e));
  });

  videoEl.addEventListener('error', () => {
    console.error(`[WA Themes] Video error, retrying in 1s (slot: ${slot})`);
    setTimeout(() => {
      videoEl.src = dataUrl;
      videoEl.load();
      videoEl.play().catch((e) => console.warn(`[WA Themes] Video play failed (error):`, e));
    }, 1000);
  });
}

// ---------------------------------------------------------------------------
// STORAGE
// ---------------------------------------------------------------------------
async function loadStorage() {
  console.log('[WA Themes] Loading storage');
  return new Promise((resolve) => {
    chrome.storage.local.get(['globalSettings', 'chatWallpapers'], (result) => {
      globalSettings = Object.assign(getDefaults(), result.globalSettings || {});
      chatSettings = result.chatWallpapers || {};
      console.log('[WA Themes] FULL globalSettings loaded:', globalSettings);
      console.log('[WA Themes] Storage loaded summary:', {
        hasGlobalSettings: !!result.globalSettings,
        hasChatSettings: !!result.chatWallpapers,
        globalWallpaperType: globalSettings.globalWallpaper?.type,
        sidebarWallpaperType: globalSettings.sidebarWallpaper?.type,
      });
      resolve();
    });
  });
}

async function persistChatSettings(chatName, data) {
  console.log(`[WA Themes] Persisting chat settings for: ${chatName}`);
  chatSettings[chatName] = data;
  return chrome.storage.local.set({ chatWallpapers: chatSettings });
}

async function deleteChatSettings(chatName) {
  console.log(`[WA Themes] Deleting chat settings for: ${chatName}`);
  delete chatSettings[chatName];
  return chrome.storage.local.set({ chatWallpapers: chatSettings });
}

// ---------------------------------------------------------------------------
// GLOBAL CSS
// ---------------------------------------------------------------------------
function applyGlobalCSS() {
  console.log('[WA Themes] Applying global CSS, enabled:', globalSettings.enabled);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'wa-theme-global-style';
    document.head.appendChild(styleEl);
    console.log('[WA Themes] Created style element:', styleEl.id);
  }
  if (!globalSettings.enabled) {
    styleEl.textContent = '';
    console.log('[WA Themes] Cleared CSS (disabled)');
    return;
  }

  const s = globalSettings;
  let css = '/* WA Themes */\n';

  if (s.fontFamily) {
    css += `${SEL.chatPanel} .copyable-text,
            ${SEL.chatPanel} span[dir="ltr"],
            ${SEL.chatPanel} span[dir="auto"] { font-family:${s.fontFamily}!important; }\n`;
  }
  if (s.fontSize) {
    css += `${SEL.chatPanel} .copyable-text { font-size:${s.fontSize}px!important; line-height:1.4!important; }\n`;
  }

  {
    const color = s.headerColor || '#202c33';
    const alpha = (s.convHeaderOpacity ?? 100) / 100;
    const blurPx = s.convHeaderBlur ?? 0;
    css += `${SEL.header} {\n`;
    css += `  background-color: ${hexToRgba(color, alpha)} !important;\n`;
    if (blurPx > 0) {
      css += `  backdrop-filter: blur(${blurPx}px) saturate(1.5) !important;\n`;
      css += `  -webkit-backdrop-filter: blur(${blurPx}px) saturate(1.5) !important;\n`;
    }
    css += `}\n`;
  }

  {
    const color = s.chatlistHeaderColor || '#202c33';
    const alpha = (s.chatlistHeaderOpacity ?? 100) / 100;
    const blurPx = s.chatlistHeaderBlur ?? 0;
    css += `${SEL.chatlistHeader}, .xq3y45c, .xbyj736 {\n`;
    css += `  background-color: ${hexToRgba(color, alpha)} !important;\n`;
    if (blurPx > 0) {
      css += `  backdrop-filter: blur(${blurPx}px) saturate(1.5) !important;\n`;
      css += `  -webkit-backdrop-filter: blur(${blurPx}px) saturate(1.5) !important;\n`;
    }
    css += `}\n`;
  }

  {
    const color = s.navStripColor || '#202c33';
    const alpha = (s.navStripOpacity ?? 100) / 100;
    const blurPx = s.navStripBlur ?? 0;
    const rgba = hexToRgba(color, alpha);
    css += `div:has(> [data-testid="chatlist-header"]) { background-color: ${rgba} !important; }\n`;
    css += `[data-testid="chatlist-header"] { background-color: ${rgba} !important;\n`;
    if (blurPx > 0) {
      css += `  backdrop-filter: blur(${blurPx}px) saturate(1.5) !important;\n`;
      css += `  -webkit-backdrop-filter: blur(${blurPx}px) saturate(1.5) !important;\n`;
    }
    css += `}\n`;
    css += `[data-testid="chatlist-header"] * { background-color: ${rgba} !important; }\n`;
  }

  if (s.sidebarColor && !s.sidebarWallpaper) {
    css += `${SEL.sidebarFull} { background-color:${s.sidebarColor}!important; }\n`;
  }
  if (s.sidebarWallpaper) {
    css += `${SEL.sidebarFull} { background-color: transparent !important; }\n`;
    css += `${SEL.leftPanel}   { background-color: transparent !important; }\n`;
    css += `#side > div:not(#pane-side) { background-color: transparent !important; }\n`;
    css += `div:has(> [data-testid="chatlist-header"]),
            [data-testid="chatlist-header"],
            [data-testid="chatlist-header"] *
            { background-color: transparent !important; background-image: none !important; }\n`;
  }

  {
    const alpha = (s.chatCardOpacity ?? 100) / 100;
    const base = s.chatCardBgColor || '#1d1f1f';
    const rgba = hexToRgba(base, alpha);
    const blurPx = s.chatCardBlurIntensity || 4;
    const doBlur = s.chatCardBlur;
    css += `[data-testid="cell-frame-container"],
            [data-testid="cell-frame-container"] > div,
            [data-testid="cell-frame-container"] > div > div {
              background-color: ${rgba} !important;
              ${doBlur ? `backdrop-filter: blur(${blurPx}px) !important;
                          -webkit-backdrop-filter: blur(${blurPx}px) !important;` : ''}
            }\n`;
  }

  styleEl.textContent = css;
  console.log('[WA Themes] Global CSS applied');
}

// ---------------------------------------------------------------------------
// BUBBLE COLOUR
// ---------------------------------------------------------------------------
function resolvedBubbleSettings(isOut) {
  const cs = currentChatName ? chatSettings[currentChatName] : null;
  const gs = globalSettings;
  
  const colour = (isOut ? cs?.outBubbleColor : cs?.inBubbleColor)
    ?? (isOut ? gs.outBubbleColor : gs.inBubbleColor);
  const opacity = (isOut ? cs?.outBubbleOpacity : cs?.inBubbleOpacity)
    ?? (isOut ? gs.outBubbleOpacity : gs.inBubbleOpacity) ?? 100;
  const doBlur = (isOut ? cs?.blurOutBubble : cs?.blurInBubble)
    ?? (isOut ? gs.blurOutBubble : gs.blurInBubble) ?? false;
  const blurPx = cs?.bubbleBlurIntensity ?? gs.blurIntensity ?? 8;
  
  console.log(`[WA Themes] resolvedBubbleSettings (isOut=${isOut})`, {
    cs,
    gs,
    colour,
    opacity,
    doBlur,
    blurPx
  });
  
  return { colour, opacity, doBlur, blurPx };
}

const BUBBLE_BG_SELECTORS = [
  '._amk6',
  '._amkg',
  '._amj3',
  '._1cop_',
  '._1JnK5'
];

function bubbleDirection(bubbleEl) {
  if (bubbleEl.classList.contains('message-out')) return 'out';
  if (bubbleEl.classList.contains('message-in')) return 'in';

  const container = bubbleEl.matches('[data-testid="msg-container"]')
    ? bubbleEl
    : bubbleEl.closest('[data-testid="msg-container"]');
  const directionRoot = container || bubbleEl;

  if (directionRoot.querySelector('[data-testid="tail-out"]')) return 'out';
  if (directionRoot.querySelector('[data-testid="tail-in"]')) return 'in';

  const panel = document.querySelector(SEL.chatPanel) || document.querySelector(SEL.main);
  if (panel) {
    const bubbleRect = directionRoot.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    if (bubbleRect.width > 0 && panelRect.width > 0) {
      const bubbleCenter = bubbleRect.left + (bubbleRect.width / 2);
      const panelCenter = panelRect.left + (panelRect.width / 2);
      const direction = bubbleCenter >= panelCenter ? 'out' : 'in';
      console.log('[WA Themes] Bubble direction inferred from geometry:', {
        direction,
        bubbleCenter: Math.round(bubbleCenter),
        panelCenter: Math.round(panelCenter),
        bubbleEl: directionRoot
      });
      return direction;
    }
  }

  return 'unknown';
}

function setImportantStyleIfChanged(el, prop, value) {
  if (
    el.style.getPropertyValue(prop) === value &&
    el.style.getPropertyPriority(prop) === 'important'
  ) {
    return false;
  }
  el.style.setProperty(prop, value, 'important');
  return true;
}

function removeStyleIfPresent(el, prop) {
  if (!el.style.getPropertyValue(prop)) return false;
  el.style.removeProperty(prop);
  return true;
}

function findBubbleBgEl(bubbleEl) {
  console.log('[WA Themes] findBubbleBgEl starting for bubble:', bubbleEl);
  console.log('[WA Themes] bubbleEl innerHTML:', bubbleEl.innerHTML.slice(0, 500));

  // Prefer known WhatsApp bubble-surface classes even when their native
  // background is transparent after WA updates or wallpaper changes.
  for (const sel of BUBBLE_BG_SELECTORS) {
    const el = bubbleEl.querySelector(sel);
    if (el) {
      const bg = getComputedStyle(el).backgroundColor;
      console.log(`[WA Themes] Found bgEl using known selector ${sel}; current background: ${bg}`, el);
      return el;
    }
  }
  
  // Try multiple known selectors in order of preference!
  const possibleSelectors = [
    '._amk6',
    '._amkg',
    '._amj3',
    '._1cop_', // another WhatsApp class
    '._1JnK5', // another one
    'div[role="row"]',
    'div[role="gridcell"]',
    'div'
  ];
  
  for (const sel of possibleSelectors) {
    const el = bubbleEl.querySelector(sel);
    if (el) {
      const bg = getComputedStyle(el).backgroundColor;
      console.log(`[WA Themes] Checking selector ${sel} → el background color: ${bg}`, el);
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        console.log('[WA Themes] Found bgEl using:', sel);
        return el;
      }
    }
  }
  console.warn('[WA Themes] Could NOT find bubbleBgEl for:', bubbleEl);
  return null;
}

function stampBubbleColour(bubbleEl) {
  console.log('[WA Themes] stampBubbleColour called for:', bubbleEl);
  if (!globalSettings.enabled) {
    console.log('[WA Themes] stampBubbleColour skipped (extension disabled)');
    return;
  }
  const direction = bubbleDirection(bubbleEl);
  if (direction === 'unknown') {
    console.warn('[WA Themes] Unknown bubble direction, skipping:', bubbleEl);
    return;
  }
  const isOut = direction === 'out';
  const { colour, opacity, doBlur, blurPx } = resolvedBubbleSettings(isOut);
  console.log('[WA Themes] bubble settings:', { direction, isOut, colour, opacity, doBlur, blurPx });
  if (!colour) {
    console.warn('[WA Themes] No colour provided, skipping');
    return;
  }
  const bgEl = findBubbleBgEl(bubbleEl);
  if (!bgEl) return;
  const rgba = hexToRgba(colour, opacity / 100);
  const changedBg = setImportantStyleIfChanged(bgEl, 'background-color', rgba);
  if (doBlur) {
    const blurValue = `blur(${blurPx}px)`;
    const changedBlur = setImportantStyleIfChanged(bgEl, 'backdrop-filter', blurValue);
    const changedWebkitBlur = setImportantStyleIfChanged(bgEl, '-webkit-backdrop-filter', blurValue);
    console.log('[WA Themes] Bubble style applied:', {
      bgEl,
      direction,
      rgba,
      changedBg,
      changedBlur,
      changedWebkitBlur
    });
  } else {
    const removedBlur = removeStyleIfPresent(bgEl, 'backdrop-filter');
    const removedWebkitBlur = removeStyleIfPresent(bgEl, '-webkit-backdrop-filter');
    console.log('[WA Themes] Bubble style applied:', {
      bgEl,
      direction,
      rgba,
      changedBg,
      removedBlur,
      removedWebkitBlur
    });
  }
}

window.waThemesDebugBubbles = function waThemesDebugBubbles(limit = 12) {
  const selector = SEL.bubbleSelectors.join(',');
  const bubbles = Array.from(document.querySelectorAll(selector)).slice(-limit);
  const summary = bubbles.map((bubbleEl, index) => {
    const direction = bubbleDirection(bubbleEl);
    const isOut = direction === 'out';
    const bgEl = findBubbleBgEl(bubbleEl);
    const bgStyle = bgEl ? getComputedStyle(bgEl) : null;
    const settings = direction === 'unknown' ? null : resolvedBubbleSettings(isOut);
    return {
      index,
      direction,
      bubbleClass: bubbleEl.className,
      bgClass: bgEl?.className || null,
      computedBackground: bgStyle?.backgroundColor || null,
      inlineBackground: bgEl?.style.getPropertyValue('background-color') || null,
      inlineBackgroundPriority: bgEl?.style.getPropertyPriority('background-color') || null,
      text: bubbleEl.innerText?.trim().slice(0, 80) || '',
      settings
    };
  });
  console.table(summary);
  console.log('[WA Themes] Bubble debug summary:', summary);
  return summary;
};

function stampAllVisibleBubbles() {
  console.log('[WA Themes] Stamping all visible bubbles with selectors:', SEL.bubbleSelectors);
  const selector = SEL.bubbleSelectors.join(',');
  document.querySelectorAll(selector).forEach(stampBubbleColour);
}

function setupBubbleObserver() {
  console.log('[WA Themes] Setting up bubble observer with selectors:', SEL.bubbleSelectors);
  if (bubbleObserver) {
    bubbleObserver.disconnect();
    bubbleObserver = null;
  }
  stampAllVisibleBubbles();
  const selector = SEL.bubbleSelectors.join(',');
  bubbleObserver = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === 'childList') {
        for (const node of mut.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches(selector)) {
            stampBubbleColour(node);
          } else {
            node.querySelectorAll?.(selector).forEach(stampBubbleColour);
          }
        }
      }
      if (mut.type === 'attributes' && mut.attributeName === 'style') {
        const bubble = mut.target.closest?.(selector);
        if (bubble) stampBubbleColour(bubble);
      }
    }
  });
  const panel = document.querySelector(SEL.chatPanel) || document.querySelector(SEL.main) || document.body;
  bubbleObserver.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
}

// ---------------------------------------------------------------------------
// CHAT CARD STAMPING
// ---------------------------------------------------------------------------
function resolvedChatCardStyle() {
  const s = globalSettings;
  const alpha = (s.chatCardOpacity ?? 100) / 100;
  const rgba = hexToRgba(s.chatCardBgColor || '#1d1f1f', alpha);
  const blur = s.chatCardBlur ? (s.chatCardBlurIntensity || 4) : 0;
  return { rgba, blur };
}

function stampChatCard(el) {
  if (!globalSettings.enabled) return;
  const { rgba, blur } = resolvedChatCardStyle();
  const targets = [el, ...el.querySelectorAll(':scope > div, :scope > div > div')];
  for (const t of targets) {
    if (t.style.getPropertyValue('background-color') !== rgba) {
      t.style.setProperty('background-color', rgba, 'important');
    }
    if (blur > 0) {
      t.style.setProperty('backdrop-filter', `blur(${blur}px)`, 'important');
      t.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px)`, 'important');
    } else {
      t.style.removeProperty('backdrop-filter');
      t.style.removeProperty('-webkit-backdrop-filter');
    }
  }
}

function stampAllChatCards() {
  console.log('[WA Themes] Stamping all chat cards');
  document.querySelectorAll(SEL.chatListItem).forEach(stampChatCard);
}

function setupChatCardObserver() {
  console.log('[WA Themes] Setting up chat card observer');
  if (chatCardObserver) {
    chatCardObserver.disconnect();
    chatCardObserver = null;
  }
  stampAllChatCards();

  chatCardObserver = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type === 'childList') {
        for (const node of mut.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.(SEL.chatListItem)) {
            stampChatCard(node);
          } else {
            node.querySelectorAll?.(SEL.chatListItem).forEach(stampChatCard);
          }
        }
      }
      if (mut.type === 'attributes' && mut.attributeName === 'style') {
        const el = mut.target;
        const card = el.closest?.(SEL.chatListItem);
        if (card) stampChatCard(card);
      }
    }
  });

  const chatList = document.querySelector(SEL.chatList)
    || document.querySelector(SEL.leftPanel)
    || document.querySelector(SEL.sidebarFull);
  if (!chatList) {
    console.warn('[WA Themes] Chat list not found for observer');
    return;
  }

  chatCardObserver.observe(chatList, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
}

function reapplyBubbleColours() {
  console.log('[WA Themes] Reapplying bubble colours');
  if (bubbleObserver) {
    bubbleObserver.disconnect();
    bubbleObserver = null;
  }
  setupBubbleObserver();
}

// ---------------------------------------------------------------------------
// CHAT BACKGROUND
// ---------------------------------------------------------------------------
async function applyPerChatBackground(chatName) {
  console.log('[WA Themes] Applying per-chat background for:', chatName);
  removeBackgroundOverlay();
  const cs = chatSettings[chatName] || {};

  let wallpaper = null;

  if (cs.wallpaperType === 'image' && cs.wallpaperData) {
    wallpaper = { type: 'image', data: cs.wallpaperData, blur: cs.wallpaperBlur };
  } else if (cs.wallpaperType === 'video' && cs.wallpaperData) {
    wallpaper = { type: 'video', data: cs.wallpaperData, blur: cs.wallpaperBlur };
  } else if (globalSettings.globalWallpaper) {
    wallpaper = globalSettings.globalWallpaper;
  }

  if (wallpaper) {
    await applyWallpaper(wallpaper);
  } else {
    console.log('[WA Themes] No wallpaper found for chat');
  }
}

async function applyWallpaper(wallpaper) {
  console.log('[WA Themes] Applying wallpaper, type:', wallpaper.type);
  const mainEl = document.querySelector(SEL.main);
  if (!mainEl) {
    console.warn('[WA Themes] Main element not found for wallpaper');
    return;
  }
  removeBackgroundOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'wa-theme-bg-overlay';
  overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:hidden;pointer-events:none;';

  if (wallpaper.type === 'image') {
    overlay.style.backgroundImage = `url(${wallpaper.data})`;
    overlay.style.backgroundSize = 'cover';
    overlay.style.backgroundPosition = 'center';
    overlay.style.backgroundRepeat = 'no-repeat';
    if (wallpaper.blur) {
      overlay.style.filter = `blur(${globalSettings.blurIntensity || 8}px)`;
      overlay.style.transform = 'scale(1.05)';
    }
  } else if (wallpaper.type === 'video') {
    const url = wallpaper.data;
    if (!url) {
      console.warn('[WA Themes] No video URL found for wallpaper');
      return;
    }

    suppressWABackground(true);
    const v = document.createElement('video');
    v.src = url; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
    v.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
      ${wallpaper.blur ? `filter:blur(${globalSettings.blurIntensity || 8}px);transform:scale(1.05);` : ''}`;
    attachVideoHandlers(v, url, 'chat');
    overlay.appendChild(v);
  }

  if (wallpaper.type === 'image') suppressWABackground(true);

  mainEl.style.position = 'relative';
  mainEl.style.overflow = 'hidden';
  mainEl.insertBefore(overlay, mainEl.firstChild);
  bgOverlay = overlay;
  console.log('[WA Themes] Wallpaper applied successfully');
}

function removeBackgroundOverlay() {
  if (bgOverlay) {
    console.log('[WA Themes] Removing background overlay');
    const v = bgOverlay.querySelector('video');
    if (v) {
      v.pause();
      v.src = '';
      v.load();
    }
    bgOverlay.remove();
    bgOverlay = null;
  }
  suppressWABackground(false);
}

function suppressWABackground(on) {
  const id = 'wa-theme-bg-suppress';
  document.getElementById(id)?.remove();
  if (!on) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = `${SEL.chatBg}{background-image:none!important;background-color:transparent!important;}`;
  document.head.appendChild(el);
}

// ---------------------------------------------------------------------------
// SIDEBAR BACKGROUND
// ---------------------------------------------------------------------------
async function applySidebarBackground() {
  console.log('[WA Themes] Applying sidebar background');
  removeSidebarBackground();
  const wp = globalSettings.sidebarWallpaper;
  if (!wp) {
    console.log('[WA Themes] No sidebar wallpaper set');
    return;
  }

  const sideEl = await waitForElement(SEL.sidebarFull);
  if (!sideEl) {
    console.error('[WA Themes] #side still not found after waiting');
    return;
  }

  const container = sideEl.parentElement;
  if (!container) {
    console.error('[WA Themes] Parent of #side not found');
    return;
  }

  const blurPx = globalSettings.sidebarBlurIntensity || 8;
  const doBlur = globalSettings.blurSidebar;
  const tintA = (globalSettings.sidebarTintOpacity ?? 0) / 100;
  const tintCol = globalSettings.sidebarTintColor || '#111b21';

  container.dataset.waThemeContainer = '1';
  sidebarContainerEl = container;

  const transparencyCss = `
    #side,
    ${SEL.leftPanel},
    div:has(> [data-testid="chatlist-header"]),
    [data-testid="chatlist-header"],
    [data-testid="chatlist-header"] *,
    #side > div:not(#pane-side),
    #side > div:not(#pane-side) *,
    #side header {
      background-color: transparent !important;
      background-image: none !important;
    }
  `;

  if (wp.type === 'image') {
    console.log('[WA Themes] Applying image sidebar wallpaper');
    container.style.setProperty('background-image', `url(${wp.data})`);
    container.style.setProperty('background-size', 'cover');
    container.style.setProperty('background-position', 'center');
    container.style.setProperty('background-repeat', 'no-repeat');

    const st = document.createElement('style');
    st.id = 'wa-theme-sidebar-style';
    st.textContent = `
      [data-wa-theme-container] {
        position: relative !important;
        overflow: hidden !important;
      }
      [data-wa-theme-container]::before {
        content: ''; position: absolute; inset: 0;
        background: inherit; z-index: 0; pointer-events: none;
        ${doBlur ? `filter: blur(${blurPx}px); transform: scale(1.05);` : ''}
        ${tintA > 0 ? `box-shadow: inset 0 0 0 9999px ${hexToRgba(tintCol, tintA)};` : ''}
      }
      [data-wa-theme-container] > * { position: relative !important; z-index: 1 !important; }
      ${transparencyCss}
    `;
    document.head.appendChild(st);
    sidebarOverlay = st;

  } else if (wp.type === 'video') {
    console.log('[WA Themes] Applying video sidebar wallpaper');
    const url = wp.data;
    if (!url) {
      console.warn('[WA Themes] No video URL for sidebar');
      return;
    }

    const vidContainer = document.createElement('div');
    vidContainer.id = 'wa-theme-sidebar-video';
    vidContainer.style.cssText = `
      position: absolute; inset: 0;
      z-index: 0; pointer-events: none; overflow: hidden;
    `;

    const v = document.createElement('video');
    v.src = url; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
    v.style.cssText = `width:100%; height:100%; object-fit:cover;
      ${doBlur ? `filter:blur(${blurPx}px); transform:scale(1.05);` : ''}`;
    attachVideoHandlers(v, url, 'sidebar');
    vidContainer.appendChild(v);

    if (tintA > 0) {
      const tint = document.createElement('div');
      tint.style.cssText = `position:absolute;inset:0;pointer-events:none;
        background-color:${hexToRgba(tintCol, tintA)};`;
      vidContainer.appendChild(tint);
    }

    container.style.setProperty('position', 'relative', 'important');
    container.style.setProperty('overflow', 'hidden', 'important');
    container.insertBefore(vidContainer, container.firstChild);
    sidebarOverlay = vidContainer;

    const st = document.createElement('style');
    st.id = 'wa-theme-sidebar-style';
    st.textContent = `
      [data-wa-theme-container] > *:not(#wa-theme-sidebar-video) {
        position: relative !important; z-index: 1 !important;
      }
      ${transparencyCss}
    `;
    document.head.appendChild(st);
  }

  console.log('[WA Themes] Sidebar wallpaper applied successfully');
}

function removeSidebarBackground() {
  console.log('[WA Themes] Removing sidebar background');
  const vid = document.getElementById('wa-theme-sidebar-video');
  if (vid) {
    const v = vid.querySelector('video');
    if (v) {
      v.pause();
      v.src = '';
      v.load();
    }
    vid.remove();
  }

  document.getElementById('wa-theme-sidebar-style')?.remove();

  if (sidebarContainerEl) {
    sidebarContainerEl.style.removeProperty('background-image');
    sidebarContainerEl.style.removeProperty('background-size');
    sidebarContainerEl.style.removeProperty('background-position');
    sidebarContainerEl.style.removeProperty('background-repeat');
    sidebarContainerEl.style.removeProperty('position');
    sidebarContainerEl.style.removeProperty('overflow');
    delete sidebarContainerEl.dataset.waThemeContainer;
    sidebarContainerEl = null;
  }

  const sideEl = document.querySelector(SEL.sidebarFull);
  if (sideEl) {
    sideEl.style.removeProperty('background-image');
    sideEl.style.removeProperty('background-size');
    sideEl.style.removeProperty('background-position');
    sideEl.style.removeProperty('background-repeat');
    sideEl.style.removeProperty('position');
    sideEl.style.removeProperty('overflow');
  }

  const paneEl = document.querySelector(SEL.leftPanel);
  if (paneEl) {
    paneEl.style.removeProperty('background-image');
    paneEl.style.removeProperty('background-size');
    paneEl.style.removeProperty('background-position');
    paneEl.style.removeProperty('background-repeat');
  }

  sidebarOverlay = null;

  document.getElementById('wa-theme-sidebar-z')?.remove();
  document.getElementById('wa-theme-sidebar-overlay')?.remove();
}

// ---------------------------------------------------------------------------
// CHAT CHANGE DETECTION
// ---------------------------------------------------------------------------
function setupChatObserver() {
  console.log('[WA Themes] Setting up chat observer');
  if (chatObserver) chatObserver.disconnect();
  chatObserver = new MutationObserver(() => {
    const titleEl = document.querySelector(SEL.chatTitle);
    if (!titleEl) return;
    const newName = titleEl.innerText?.trim();
    if (newName && newName !== currentChatName) {
      currentChatName = newName;
      console.log('[WA Themes] Chat switched to:', currentChatName);
      applyPerChatBackground(currentChatName);
      reapplyBubbleColours();
    }
  });
  const root = document.querySelector(SEL.main) || document.querySelector('#app') || document.body;
  chatObserver.observe(root, { childList: true, subtree: true });
}

// ---------------------------------------------------------------------------
// THREE-DOT MENU INJECTION
// ---------------------------------------------------------------------------
function setupMenuObserver() {
  console.log('[WA Themes] Setting up menu observer');
  if (menuObserver) menuObserver.disconnect();
  menuObserver = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      for (const node of mut.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const menu = node.matches?.(SEL.dropdownMenu) ? node : node.querySelector?.(SEL.dropdownMenu);
        if (menu) setTimeout(() => tryInjectMenuOption(menu), 80);
      }
    }
  });
  menuObserver.observe(document.body, { childList: true, subtree: true });
}

function tryInjectMenuOption(menuEl) {
  if (!document.querySelector(SEL.header) || !document.querySelector(SEL.chatTitle)) return;
  if (menuEl.querySelector('#wa-theme-menu-item')) return;

  const itemContainer = menuEl.querySelector('div') || menuEl;
  const existingItem = itemContainer.querySelector('[role="menuitem"]') || itemContainer.querySelector('button');
  if (!existingItem) return;

  const btn = document.createElement('button');
  btn.id = 'wa-theme-menu-item';
  btn.role = 'menuitem';
  btn.className = existingItem.className;
  btn.setAttribute('aria-label', 'Chat Wallpaper');
  btn.style.cssText = 'display:flex;align-items:center;gap:14px;width:100%;cursor:pointer;background:none;border:none;color:inherit;';
  btn.innerHTML = `
    <span style="display:flex;align-items:center;opacity:.65;flex-shrink:0;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 3H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0
                 16H3V5h18v14zm-5-7l-3 3.86L9 10l-4 5h14l-4-5z"/>
      </svg>
    </span>
    <span>Chat Wallpaper</span>
  `;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    setTimeout(() => openChatSettingsModal(currentChatName), 60);
  });

  itemContainer.insertBefore(btn, itemContainer.firstChild);
  console.log('[WA Themes] Menu item injected');
}

// ---------------------------------------------------------------------------
// PER-CHAT SETTINGS MODAL
// ---------------------------------------------------------------------------
function openChatSettingsModal(chatName) {
  console.log('[WA Themes] Opening chat settings for:', chatName);
  document.getElementById('wa-theme-modal')?.remove();
  if (!chatName) {
    showToast('No chat open.', 'error');
    return;
  }

  const existing = chatSettings[chatName] || {};
  let pendingWpData = null;
  let pendingWpType = null;

  const modal = document.createElement('div');
  modal.id = 'wa-theme-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100000;
    display:flex;align-items:center;justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    overflow-y:auto;padding:20px 0;
  `;

  const hasExistingWp = existing.wallpaperType && existing.wallpaperData;

  modal.innerHTML = `
    <style>
      @keyframes waTIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
      #wa-tm-inner button:hover{opacity:.85;}
      .wa-tm-section{margin-bottom:18px;}
      .wa-tm-stitle{font-size:11px;font-weight:600;color:#00a884;text-transform:uppercase;
                    letter-spacing:.5px;margin-bottom:10px;}
      .wa-tm-row{display:flex;align-items:center;justify-content:space-between;
                 gap:8px;margin-bottom:9px;}
      .wa-tm-row label{color:#d1d7db;font-size:13px;flex:1;}
      .wa-tm-range{width:100px;accent-color:#00a884;}
      .wa-tm-rlabel{font-size:11px;color:#8696a0;min-width:34px;text-align:right;}
      .wa-tm-toggle{position:relative;display:inline-block;width:38px;height:21px;flex-shrink:0;}
      .wa-tm-toggle input{opacity:0;width:0;height:0;}
      .wa-tm-slider{position:absolute;cursor:pointer;inset:0;background:#374d58;border-radius:21px;transition:background .25s;}
      .wa-tm-slider::before{content:'';position:absolute;height:15px;width:15px;left:3px;bottom:3px;
                             background:#ccc;border-radius:50%;transition:transform .25s,background .25s;}
      .wa-tm-toggle input:checked+.wa-tm-slider{background:#00a884;}
      .wa-tm-toggle input:checked+.wa-tm-slider::before{transform:translateX(17px);background:white;}
      .wa-tm-bubble-group{background:#172027;border-radius:8px;padding:8px 10px 4px;margin-bottom:10px;}
      .wa-tm-bglabel{font-size:11px;font-weight:600;color:#8696a0;text-transform:uppercase;
                     letter-spacing:.4px;margin-bottom:8px;}
    </style>

    <div id="wa-tm-inner" style="
      background:#1f2c33;border-radius:14px;padding:24px 26px 22px;
      width:460px;max-width:94vw;color:#e9edef;
      box-shadow:0 24px 72px rgba(0,0,0,.6);animation:waTIn .18s ease;
    ">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
        <div>
          <div style="font-size:17px;font-weight:600;margin-bottom:3px;">Chat Settings</div>
          <div style="font-size:12px;color:#8696a0;max-width:280px;
                      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(chatName)}</div>
        </div>
        <button id="wa-modal-close" style="background:none;border:none;color:#8696a0;
                font-size:20px;cursor:pointer;padding:0 0 0 12px;">✕</button>
      </div>

      <div class="wa-tm-section">
        <div class="wa-tm-stitle">🖼️ Wallpaper</div>
        <div id="wa-modal-preview" style="
          width:100%;height:130px;border-radius:10px;background:#2a3942;
          margin-bottom:12px;overflow:hidden;position:relative;
          display:flex;align-items:center;justify-content:center;color:#8696a0;font-size:13px;
        ">${hasExistingWp ? '' : 'No wallpaper set'}</div>
        <div style="display:flex;gap:9px;margin-bottom:10px;">
          <button id="wa-btn-img" style="flex:1;padding:9px;border-radius:8px;border:1px solid #374d58;
            background:#2a3942;color:#e9edef;cursor:pointer;font-size:12px;">📷 Image</button>
          <button id="wa-btn-vid" style="flex:1;padding:9px;border-radius:8px;border:1px solid #374d58;
            background:#2a3942;color:#e9edef;cursor:pointer;font-size:12px;">🎬 Video</button>
          ${hasExistingWp ? `
          <button id="wa-btn-wp-remove" style="padding:9px 13px;border-radius:8px;
            border:1px solid #374d58;background:transparent;color:#8696a0;cursor:pointer;font-size:12px;">✕</button>` : ''}
        </div>
        <input type="file" id="wa-file-img" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none">
        <input type="file" id="wa-file-vid" accept="video/mp4,video/webm" style="display:none">
        <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:12px;
                       color:#d1d7db;margin-bottom:4px;">
          <input type="checkbox" id="wa-opt-blur" ${existing.wallpaperBlur ? 'checked' : ''} style="accent-color:#00a884;">
          Blur this wallpaper
        </label>
      </div>

      <div class="wa-tm-section">
        <div class="wa-tm-stitle">💬 Bubble Overrides</div>

        <div class="wa-tm-bubble-group">
          <div class="wa-tm-bglabel">↑ Your messages</div>
          <div class="wa-tm-row">
            <label>Color</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="wa-opt-out-color" value="${existing.outBubbleColor || '#144d37'}">
              <button id="wa-opt-out-reset" style="background:#374d58;border:none;color:#8696a0;padding:4px 8px;border-radius:6px;cursor:pointer;">Reset</button>
            </div>
          </div>
          <div class="wa-tm-row">
            <label>Opacity</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="range" id="wa-opt-out-opacity" min="0" max="100" value="${existing.outBubbleOpacity ?? 100}" class="wa-tm-range">
              <span class="wa-tm-rlabel" id="wa-opt-out-opacity-val">${existing.outBubbleOpacity ?? 100}%</span>
            </div>
          </div>
          <div class="wa-tm-row">
            <label>Blur</label>
            <label class="wa-tm-toggle">
              <input type="checkbox" id="wa-opt-out-blur" ${existing.blurOutBubble ? 'checked' : ''}>
              <span class="wa-tm-slider"></span>
            </label>
          </div>
        </div>

        <div class="wa-tm-bubble-group">
          <div class="wa-tm-bglabel">↓ Their messages</div>
          <div class="wa-tm-row">
            <label>Color</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="wa-opt-in-color" value="${existing.inBubbleColor || '#242626'}">
              <button id="wa-opt-in-reset" style="background:#374d58;border:none;color:#8696a0;padding:4px 8px;border-radius:6px;cursor:pointer;">Reset</button>
            </div>
          </div>
          <div class="wa-tm-row">
            <label>Opacity</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="range" id="wa-opt-in-opacity" min="0" max="100" value="${existing.inBubbleOpacity ?? 100}" class="wa-tm-range">
              <span class="wa-tm-rlabel" id="wa-opt-in-opacity-val">${existing.inBubbleOpacity ?? 100}%</span>
            </div>
          </div>
          <div class="wa-tm-row">
            <label>Blur</label>
            <label class="wa-tm-toggle">
              <input type="checkbox" id="wa-opt-in-blur" ${existing.blurInBubble ? 'checked' : ''}>
              <span class="wa-tm-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <button id="wa-save-chat" style="flex:1;padding:12px;border-radius:8px;background:#00a884;border:none;color:white;cursor:pointer;font-size:14px;font-weight:600;">Save</button>
        <button id="wa-delete-chat" style="padding:12px 16px;border-radius:8px;border:1px solid #ea0038;background:transparent;color:#ea0038;cursor:pointer;font-size:14px;font-weight:600;">Delete All</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (hasExistingWp) {
    renderPreview('wa-modal-preview', existing.wallpaperType, existing.wallpaperData);
  }

  document.getElementById('wa-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  const fileImg = document.getElementById('wa-file-img');
  const fileVid = document.getElementById('wa-file-vid');
  document.getElementById('wa-btn-img').addEventListener('click', () => fileImg.click());
  document.getElementById('wa-btn-vid').addEventListener('click', () => fileVid.click());

  fileImg.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    readFileAsDataURL(f).then((data) => {
      pendingWpType = 'image';
      pendingWpData = data;
      renderPreview('wa-modal-preview', 'image', data);
    });
  });

  fileVid.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    readFileAsDataURL(f).then((data) => {
      pendingWpType = 'video';
      pendingWpData = data;
      renderPreview('wa-modal-preview', 'video', data);
    });
  });

  const removeBtn = document.getElementById('wa-btn-wp-remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      pendingWpType = 'removed';
      pendingWpData = null;
      const preview = document.getElementById('wa-modal-preview');
      preview.innerHTML = '<span>No wallpaper set</span>';
    });
  }

  const outOpacity = document.getElementById('wa-opt-out-opacity');
  const outOpacityVal = document.getElementById('wa-opt-out-opacity-val');
  outOpacity.addEventListener('input', () => outOpacityVal.textContent = `${outOpacity.value}%`);

  const inOpacity = document.getElementById('wa-opt-in-opacity');
  const inOpacityVal = document.getElementById('wa-opt-in-opacity-val');
  inOpacity.addEventListener('input', () => inOpacityVal.textContent = `${inOpacity.value}%`);

  document.getElementById('wa-opt-out-reset').addEventListener('click', () => {
    document.getElementById('wa-opt-out-color').value = '#144d37';
    document.getElementById('wa-opt-out-opacity').value = 100;
    document.getElementById('wa-opt-out-opacity-val').textContent = '100%';
    document.getElementById('wa-opt-out-blur').checked = false;
  });

  document.getElementById('wa-opt-in-reset').addEventListener('click', () => {
    document.getElementById('wa-opt-in-color').value = '#242626';
    document.getElementById('wa-opt-in-opacity').value = 100;
    document.getElementById('wa-opt-in-opacity-val').textContent = '100%';
    document.getElementById('wa-opt-in-blur').checked = false;
  });

  document.getElementById('wa-save-chat').addEventListener('click', async () => {
    const blur = document.getElementById('wa-opt-blur').checked;
    const outColor = document.getElementById('wa-opt-out-color').value;
    const outOpacityVal = parseInt(document.getElementById('wa-opt-out-opacity').value);
    const outBlur = document.getElementById('wa-opt-out-blur').checked;
    const inColor = document.getElementById('wa-opt-in-color').value;
    const inOpacityVal = parseInt(document.getElementById('wa-opt-in-opacity').value);
    const inBlur = document.getElementById('wa-opt-in-blur').checked;

    let newSettings = { ...existing };

    if (pendingWpType === 'removed') {
      newSettings.wallpaperType = null;
      newSettings.wallpaperData = null;
      newSettings.wallpaperBlur = false;
    } else if (pendingWpType && pendingWpData) {
      newSettings.wallpaperType = pendingWpType;
      newSettings.wallpaperData = pendingWpData;
      newSettings.wallpaperBlur = blur;
    } else if (existing.wallpaperData) {
      newSettings.wallpaperBlur = blur;
    }

    newSettings.outBubbleColor = outColor;
    newSettings.outBubbleOpacity = outOpacityVal;
    newSettings.blurOutBubble = outBlur;
    newSettings.inBubbleColor = inColor;
    newSettings.inBubbleOpacity = inOpacityVal;
    newSettings.blurInBubble = inBlur;

    await persistChatSettings(chatName, newSettings);
    await applyPerChatBackground(chatName);
    reapplyBubbleColours();
    showToast('Saved!', 'success');
    modal.remove();
  });

  document.getElementById('wa-delete-chat').addEventListener('click', async () => {
    if (!confirm('Delete all custom settings for this chat?')) return;
    await deleteChatSettings(chatName);
    await applyPerChatBackground(chatName);
    reapplyBubbleColours();
    showToast('Deleted!', 'success');
    modal.remove();
  });
}

function renderPreview(id, type, data) {
  const el = document.getElementById(id);
  el.innerHTML = '';
  if (type === 'video') {
    const v = document.createElement('video');
    v.src = data; v.autoplay = true; v.loop = true; v.muted = true;
    v.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    el.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = data;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    el.appendChild(img);
  }
}

async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showToast(text, type) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
    background:${type === 'success' ? '#00a884' : '#ea0038'};color:white;
    padding:12px 24px;border-radius:8px;font-weight:600;z-index:100001;
    animation:waTIn .2s ease;
  `;
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ---------------------------------------------------------------------------
// INITIALIZE
// ---------------------------------------------------------------------------
async function init() {
  console.log('[WA Themes] Initializing...');
  await loadStorage();
  applyGlobalCSS();
  setupChatObserver();
  setupMenuObserver();
  setupBubbleObserver();
  setupChatCardObserver();
  await applySidebarBackground();

  const titleEl = await waitForElement(SEL.chatTitle, 10000);
  if (titleEl) {
    currentChatName = titleEl.innerText?.trim();
    if (currentChatName) {
      console.log('[WA Themes] Initial chat name:', currentChatName);
      applyPerChatBackground(currentChatName);
    }
  }
  console.log('[WA Themes] Initialization complete!');
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('[WA Themes] Received message:', message.type);
  if (message.type === 'SETTINGS_UPDATED') {
    await loadStorage();
    applyGlobalCSS();
    await applySidebarBackground();
    if (currentChatName) applyPerChatBackground(currentChatName);
    stampAllVisibleBubbles();
    stampAllChatCards();
  }
  if (message.type === 'GET_CURRENT_CHAT') {
    sendResponse({ chatName: currentChatName });
  }
});

init();
