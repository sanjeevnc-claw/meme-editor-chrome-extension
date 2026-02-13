/**
 * MemeForge - Background Service Worker
 */

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'edit-in-memeforge',
    title: 'Edit in MemeForge',
    contexts: ['image']
  });
  
  // Enable side panel to open on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'edit-in-memeforge') {
    // Store the image URL
    await chrome.storage.local.set({ contextMenuImageUrl: info.srcUrl });
    
    // Open the side panel
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
