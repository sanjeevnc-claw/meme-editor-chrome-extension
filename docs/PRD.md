# MemeForge - Chrome Extension Meme Editor

## Product Requirements Document (PRD)

### Overview

MemeForge is a lightweight Chrome extension that lets you create memes instantly from any webpage. Take a screenshot, paste from clipboard, or right-click any image — then add text, combine images, and export your meme in seconds.

### Problem Statement

Creating memes requires:
1. Taking a screenshot
2. Opening an image editor (Photoshop, Figma, etc.)
3. Adding text with the right font/style
4. Exporting and saving

**This is too many steps.** MemeForge brings the editor directly into your browser.

---

## Core Features (MVP)

### 1. Image Input Methods

| Method | Description |
|--------|-------------|
| **Clipboard Paste** | Ctrl/Cmd+V to paste screenshot or copied image |
| **Context Menu** | Right-click any image → "Edit in MemeForge" |
| **File Upload** | Traditional file picker as fallback |
| **Drag & Drop** | Drop images directly into the extension |

### 2. Canvas Layouts (Meme Formats)

| Layout | Description | Use Case |
|--------|-------------|----------|
| **Single** | One image, full canvas | Classic meme |
| **Vertical Stack** | Two images stacked (1:1 each) | Expectation vs Reality |
| **Horizontal Split** | Two images side by side | Drake meme style |
| **4-Panel Grid** | 2x2 grid | Comic strip style |

### 3. Text Editor

- **Fonts:** Impact (default), Arial, Comic Sans MS
- **Styling:** Bold, outline/stroke (classic meme style)
- **Placement:** Drag anywhere, snap to top/bottom
- **Multiple text boxes:** Add as many as needed
- **Text controls:**
  - Font size slider
  - Text color (white default)
  - Stroke color (black default)
  - Stroke width

### 4. Export

- **Download as PNG** (primary)
- **Copy to clipboard** (for quick paste to Discord/Slack/Twitter)
- **Quality:** Full resolution

---

## User Flows

### Flow 1: Screenshot → Meme

```
1. User takes screenshot (OS native)
2. Opens MemeForge extension
3. Pastes with Ctrl/Cmd+V
4. Adds text
5. Downloads or copies to clipboard
```

### Flow 2: Right-click Image → Meme

```
1. User sees funny image on webpage
2. Right-clicks → "Edit in MemeForge"
3. Image opens in extension
4. Adds text
5. Downloads or copies to clipboard
```

### Flow 3: Combine Two Images

```
1. User has two images
2. Opens MemeForge, selects "Vertical Stack" layout
3. Pastes/uploads first image to top slot
4. Pastes/uploads second image to bottom slot
5. Adds text to each
6. Downloads combined meme
```

---

## Technical Architecture

### Stack

| Component | Technology |
|-----------|------------|
| **UI Framework** | Vanilla JS + HTML/CSS (fast, no build step) |
| **Canvas Library** | [Fabric.js](http://fabricjs.com/) (open-source, MIT) |
| **Extension Type** | Manifest V3 (Chrome) |
| **Popup Size** | 500px × 600px |

### Why Fabric.js?

- ✅ Open-source (MIT license)
- ✅ Object-based canvas manipulation
- ✅ Built-in text editing with styling
- ✅ Drag, resize, rotate objects
- ✅ Export to PNG/JPEG
- ✅ Well-documented, active community

### Extension Structure

```
meme-editor-extension/
├── manifest.json          # Extension config (Manifest V3)
├── popup.html             # Main UI
├── popup.css              # Styles
├── popup.js               # Main logic
├── background.js          # Service worker (context menu)
├── lib/
│   └── fabric.min.js      # Fabric.js library
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Permissions Needed

```json
{
  "permissions": [
    "contextMenus",      // Right-click menu
    "activeTab",         // Access current tab for image URL
    "clipboardRead",     // Paste from clipboard
    "clipboardWrite"     // Copy meme to clipboard
  ]
}
```

---

## MVP Scope

### ✅ In Scope (v1.0)

- [ ] Clipboard paste (Ctrl/Cmd+V)
- [ ] Right-click context menu on images
- [ ] Single image canvas
- [ ] Vertical stack layout (2 images)
- [ ] Text with Impact/Arial/Comic Sans
- [ ] Text stroke (outline) for meme style
- [ ] Drag to position text
- [ ] Multiple text boxes
- [ ] Download as PNG
- [ ] Copy to clipboard

### ❌ Out of Scope (Future)

- Templates (pre-made meme formats)
- GIF support
- Drawing tools
- Filters/effects
- Cloud storage
- Meme library/search
- Firefox/Safari support

---

## UI Mockup (Text-based)

```
┌─────────────────────────────────────────────┐
│  MemeForge                          [?] [×] │
├─────────────────────────────────────────────┤
│  Layout: [Single ▼] [Stack] [Side] [Grid]   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  │         [ Paste image here ]          │  │
│  │            or drag & drop             │  │
│  │                                       │  │
│  │          YOUR MEME TEXT               │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│  [+ Add Text]                               │
│                                             │
│  Font: [Impact ▼]  Size: [====○====]        │
│  Color: [■ White]  Stroke: [■ Black]        │
├─────────────────────────────────────────────┤
│  [📋 Copy to Clipboard]  [💾 Download PNG]  │
└─────────────────────────────────────────────┘
```

---

## Development Phases

### Phase 1: Foundation (Day 1)
- [ ] Extension scaffold (manifest, popup, icons)
- [ ] Fabric.js canvas setup
- [ ] Clipboard paste functionality
- [ ] Basic text adding with Impact font

### Phase 2: Core Features (Day 1-2)
- [ ] Right-click context menu integration
- [ ] Text styling (font selection, size, stroke)
- [ ] Download PNG functionality
- [ ] Copy to clipboard

### Phase 3: Layouts (Day 2)
- [ ] Vertical stack layout
- [ ] Horizontal split layout
- [ ] Image slot management

### Phase 4: Polish (Day 2-3)
- [ ] Drag & drop images
- [ ] Multiple text boxes
- [ ] UI polish
- [ ] Testing & bug fixes

---

## Success Metrics

- **Time to meme:** < 30 seconds from screenshot to download
- **Click count:** < 5 clicks for basic meme
- **Extension size:** < 500KB

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Clipboard API browser restrictions | Fall back to file upload |
| Large images slow canvas | Auto-resize on import |
| Fabric.js bundle size (~300KB) | Acceptable for functionality gained |

---

## Ready to Build?

MVP can be built in **1-2 days**. Let's start with Phase 1:

1. Create extension scaffold
2. Set up Fabric.js canvas
3. Implement clipboard paste
4. Add basic text functionality

**Let's go! 🚀**
