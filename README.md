# WhatsApp Custom Wallpaper

A Chrome/Edge extension for customizing WhatsApp Web with per-chat wallpapers, bubble colors, fonts, blur effects, and sidebar theming.

## Features

- Global theme controls for outgoing and incoming message bubbles.
- Per-chat wallpapers with image or video support.
- Optional blur/glass effects for chat backgrounds, sidebars, and bubbles.
- Custom font family and font size for WhatsApp Web.
- Header, sidebar tint, and sidebar solid color styling.
- Per-chat settings list with saved wallpaper summaries and delete actions.

## Installation

1. Download or clone this repository.
2. Open Chrome or Edge and go to the extensions page.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the project folder: `wa-themes`.
6. Open WhatsApp Web and use the extension popup to apply your theme.

## Usage

1. Open WhatsApp Web and click the extension icon.
2. Adjust the global theme controls in the popup.
3. Choose an image or video wallpaper for the main chat area or sidebar.
4. Click Apply Changes.
5. For per-chat wallpapers, switch to the Per-Chat tab and set the wallpaper from the WhatsApp chat menu.

## Project Structure

- `manifest.json` - Extension metadata, permissions, content script, and popup configuration.
- `popup.html` - Popup UI for global and per-chat theme controls.
- `popup.css` - Styling for the popup interface.
- `popup.js` - Popup logic for saving settings, previewing wallpapers, and syncing with the active tab.
- `content.js` - Injected WhatsApp Web styling and wallpaper logic.
- `background.js` - Minimal service worker for extension lifecycle events.

## Permissions

This extension uses the following permissions:

- `storage` and `unlimitedStorage` for saving theme settings and wallpapers.
- `activeTab` and `tabs` for communicating with the active WhatsApp Web tab.
- `https://web.whatsapp.com/*` host access so the content script can style WhatsApp Web.

## Notes

- This extension is designed for WhatsApp Web only.
- Wallpapers can be saved as image or video data URLs in browser storage.
- If you change WhatsApp Web or browser settings, you may need to reload the extension.

## Repository

GitHub: https://github.com/ApexBlue11/Whatsapp-Custom-Wallpaper