# WhatsApp Custom Wallpaper

A Chrome/Edge extension that lets you customise WhatsApp Web with:
- 🖼️ Per-chat wallpapers (image or video)
- 🎨 Custom bubble colours for incoming and outgoing messages
- 🔲 Blur and glass effects on backgrounds, sidebars, and bubbles
- 🔤 Custom font family and font size
- 🎨 Header and sidebar tinting

---

## ⚡ Quick Install (Recommended)

> Just want it working? Do this.

1. Download **`install-whatsapp-wallpaper.bat`** from this repo
2. Double-click it
3. If Windows shows a SmartScreen warning, click **More info → Run anyway**
4. A **folder picker** will open — choose where to install the extension
5. Once done, **`HOW-TO.txt`** opens in Notepad with full instructions, and **Chrome** opens to the extensions page

**Then in Chrome or Edge:**
1. Turn on **Developer mode** (toggle in the top-right of the extensions page)
2. Click **Load unpacked**
3. Select the folder you chose in step 4 above
4. Click the **puzzle piece icon** in your browser toolbar → find this extension → click the **pin icon** to pin it

Then open [WhatsApp Web](https://web.whatsapp.com) and click the extension icon in your toolbar to start customising.

---

## 🛠 Manual Install (Alternative)

1. Download this repo as a ZIP and extract it anywhere, or clone it:
   ```
   git clone https://github.com/ApexBlue11/Whatsapp-Custom-Wallpaper.git
   ```
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the folder containing `manifest.json`
6. Pin the extension via the puzzle piece icon in the toolbar

---

## 📌 Pinning the Extension

The extension is controlled through a popup. To access it you need the icon visible in your toolbar — if it isn't pinned, you won't be able to open the menu.

**Chrome:**
1. Click the **puzzle piece icon** (🧩) in the top-right of the browser
2. Find **WhatsApp Custom Wallpaper** in the list
3. Click the **pin icon** next to it

**Edge:**
1. Click the **puzzle piece icon** in the top-right of the browser
2. Click the **eye icon** next to this extension to show it in the toolbar

The extension icon will now always be visible. Click it while on WhatsApp Web to open the settings menu.

---

## 🎛️ How to Use

### Global theme (affects all chats)

1. Open [WhatsApp Web](https://web.whatsapp.com)
2. Click the **extension icon** in your toolbar
3. In the popup:
   - Set **bubble colours** for outgoing and incoming messages
   - Choose an **image or video wallpaper** for the main chat background
   - Toggle **blur / glass effects** on backgrounds and sidebars
   - Change the **font family** and font size
   - Tint the **header** and **sidebar**
4. Click **Apply Changes**

### Per-chat wallpaper (different wallpaper per conversation)

1. Open the specific chat in WhatsApp Web
2. Click the **three dots** (⋮) in the top-right of the chat header
3. Find the per-chat wallpaper section
4. Set your wallpaper and apply

---

## 📁 Project Structure

```
manifest.json    — Extension metadata, permissions, content script config
popup.html       — Popup UI for global and per-chat theme controls
popup.css        — Popup styling
popup.js         — Popup logic: settings, wallpaper preview, tab sync
content.js       — Injected into WhatsApp Web to apply styling
background.js    — Minimal service worker for extension lifecycle
icons/           — Extension icons
```

---

## ❗ Troubleshooting

<details>
<summary><strong>I can't find or open the extension popup</strong></summary>

The extension icon needs to be pinned to your toolbar to access the menu.

- Click the puzzle piece icon (🧩) in your browser toolbar
- Find **WhatsApp Custom Wallpaper** and click the pin icon next to it
- The icon will now appear in your toolbar — click it while on WhatsApp Web
</details>

<details>
<summary><strong>Extension won't load</strong></summary>

- Make sure the selected folder contains `manifest.json`
- Confirm Developer mode is enabled in `chrome://extensions`
- Check for error details on the extensions page
</details>

<details>
<summary><strong>Changes aren't showing on WhatsApp Web</strong></summary>

- Make sure you clicked **Apply Changes** in the popup
- Go to `chrome://extensions` and click **Reload** on this extension
- Refresh the WhatsApp Web tab
</details>

<details>
<summary><strong>Extension disappeared after a browser update</strong></summary>

Go to `chrome://extensions`, click **Load unpacked**, and select your installation folder again. Then re-pin it.
</details>

<details>
<summary><strong>Per-chat wallpaper not applying</strong></summary>

- Open the specific chat in WhatsApp Web
- Click the three dots (⋮) at the top-right of the chat
- Find the per-chat wallpaper section and re-apply
</details>

<details>
<summary><strong>WhatsApp Web updated and styling broke</strong></summary>

WhatsApp occasionally changes their page structure, which can break injected styles. Reload the extension at `chrome://extensions` and refresh the WhatsApp Web tab. If it's still broken, check the repo for updates.
</details>

---

## 📋 Permissions Used

| Permission | Why |
|---|---|
| `storage` / `unlimitedStorage` | Saves your theme settings and wallpapers locally in the browser |
| `activeTab` / `tabs` | Communicates with the active WhatsApp Web tab to apply changes |
| `https://web.whatsapp.com/*` | Allows the content script to inject styles into WhatsApp Web |

No data is collected or sent anywhere. Everything is stored locally in your browser.

---

## 📝 Notes

- Works with **WhatsApp Web only** — not the desktop app
- Wallpapers are stored as data URLs in browser storage, so no external files are needed
- If WhatsApp Web updates and something breaks, reloading the extension usually fixes it
