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
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'edit-in-memeforge') {
    // Store the image URL
    await chrome.storage.local.set({ contextMenuImageUrl: info.srcUrl });
    
    // Set badge to indicate image is ready
    chrome.action.setBadgeText({ text: '1' });
    chrome.action.setBadgeBackgroundColor({ color: '#e94560' });
    
    // Note: Can't programmatically open popup in Manifest V3
    // User needs to click the extension icon
  }
});

// Clear badge when popup opens
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    chrome.action.setBadgeText({ text: '' });
  }
});
