// background.js — service worker (minimal; storage is handled directly by content + popup)

chrome.runtime.onInstalled.addListener(() => {
  console.log('[WA Themes] Extension installed / updated.');
});
