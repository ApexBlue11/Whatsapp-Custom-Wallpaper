# WhatsApp Themes

Custom wallpapers and styling for WhatsApp Web.

## Features

- Per-chat wallpapers with image or video backgrounds
- Global chat wallpaper
- Sidebar wallpaper and tint controls
- Incoming and outgoing message bubble colours
- Bubble opacity and optional blur/glass effect
- Font family and font size controls
- Header, chat list, navigation strip, and chat card styling
- Per-chat settings from the WhatsApp Web chat menu

## Install

### Easy Windows Install

1. Download or clone this repository.
2. Run `install-whatsapp-themes.bat`.
3. Pick the folder where the unpacked extension should be installed.
4. In Chrome, open `chrome://extensions`.
5. Enable `Developer mode`.
6. Click `Load unpacked`.
7. Select the folder chosen in step 3.

The installer also opens a `HOW-TO-INSTALL.txt` file with these steps.

### Manual Install

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this repository folder.
6. Open `https://web.whatsapp.com/`.

## Usage

Open the extension popup to configure global theme settings. For per-chat wallpapers and bubble overrides, open a WhatsApp Web chat, click the chat menu, and choose `Chat Wallpaper`.

## Notes

- Large video wallpapers can temporarily increase memory usage while Chrome decodes and buffers them.
- Chrome may pause background videos to save power when the tab is hidden or inactive.
- If WhatsApp Web changes its internal DOM, bubble styling may need selector updates.

## Development

The extension is a Manifest V3 Chrome extension. Main files:

- `manifest.json`
- `popup.html`
- `popup.css`
- `popup.js`
- `content.js`
- `video-utils.js`
- `background.js`

Run a syntax check for the main content script with:

```powershell
node --check content.js
```
