/**
 * MemeForge - Background Service Worker
 * Handles context menu for right-clicking images
 */

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'edit-in-memeforge',
    title: 'Edit in MemeForge',
    contexts: ['image']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'edit-in-memeforge') {
    // Store the image URL
    chrome.storage.local.set({ contextMenuImageUrl: info.srcUrl }, () => {
      // Open the popup
      chrome.action.openPopup();
    });
  }
});
