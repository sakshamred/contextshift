# CONTEXTSHIFT

> Carry your context anywhere.

A browser extension that exports AI conversations and generates handoff prompts to seamlessly continue your work in any other AI.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-gold) ![Chrome](https://img.shields.io/badge/Chrome-Compatible-green) ![Brave](https://img.shields.io/badge/Brave-Compatible-orange) ![Arc](https://img.shields.io/badge/Arc-Compatible-blue)

---

## The Problem

You're deep in a conversation with Claude. Tokens run out, or you want GPT's opinion, or Gemini's search grounding. You switch tabs and lose everything — the context, the decisions, the code, the direction.

## The Solution

**ContextShift** sits in your browser. One click exports your entire conversation. One more click generates a handoff prompt — a perfectly formatted summary you paste into any other AI to continue exactly where you left off.

---

## Supported Platforms

| Platform | URL |
|----------|-----|
| Claude | claude.ai |
| ChatGPT | chat.openai.com / chatgpt.com |
| Gemini | gemini.google.com |
| Grok | grok.com |
| Perplexity | perplexity.ai |
| Phind | phind.com |
| You.com | you.com |

---

## Features

### Export Conversation
- Scrapes the full conversation from the current tab
- Exports as `.txt`, `.md`, or `.json`
- Code blocks preserved with language labels
- Images noted as `[IMAGE ATTACHED]`
- Smart file naming: `contextshift_[platform]_[date]_[preview].ext`

### Generate Handoff Prompt
- Uses Claude Haiku (via your own API key) to generate a dense context summary
- Covers: what was built, decisions made, current state, next steps, constraints
- One-click copy to clipboard
- Appended to exported files automatically

### Conversation Library
- All exports stored locally in IndexedDB
- Last 10 exports with platform, date, and preview
- Search by keyword
- Re-export or regenerate handoff from any saved conversation
- One-click delete

### Quick Paste Mode
- Detects when you open a new AI tab
- Shows a floating bubble: "Paste context from last session?"
- Click to paste the handoff prompt directly into the input

---

## Install

### Chrome / Brave / Arc / Edge

1. Clone or download this repository
2. Open `chrome://extensions/` in your browser
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `contextshift` folder
6. Pin the extension to your toolbar

### Firefox (with minor tweaks)

The extension is built for Manifest V3. Firefox support requires:
- Changing `"service_worker"` to `"scripts"` in the background section of `manifest.json`
- Using `browser.*` instead of `chrome.*` APIs (or use the webextension-polyfill)

---

## Setup

1. Click the ContextShift icon in your toolbar
2. Go to the **Settings** tab
3. Paste your Anthropic API key
4. Your key is stored locally in `chrome.storage.local` — it never leaves your browser

---

## Privacy

- **Zero servers.** All data stays in your browser.
- **Zero telemetry.** No analytics, no tracking, no phoning home.
- **Zero accounts.** No login, no signup.
- **Your API key** is stored only in `chrome.storage.local` and used exclusively for handoff prompt generation via Anthropic's API.

---

## File Structure

```
contextshift/
├── manifest.json              # Manifest V3 config
├── background.js              # Service worker
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup logic
├── content-scripts/
│   ├── claude.js              # Claude.ai scraper
│   ├── chatgpt.js             # ChatGPT scraper
│   ├── gemini.js              # Gemini scraper
│   ├── grok.js                # Grok scraper
│   ├── perplexity.js          # Perplexity scraper
│   ├── phind.js               # Phind scraper
│   ├── you.js                 # You.com scraper
│   └── quickpaste.js          # Quick paste bubble
├── utils/
│   ├── parser.js              # Shared parsing logic
│   ├── exporter.js            # File generation
│   └── db.js                  # IndexedDB library
├── styles/
│   ├── popup.css              # Popup styles
│   └── quickpaste.css         # Quick paste bubble styles
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Tech Stack

- Manifest V3 (Chrome + Brave + Arc compatible)
- Vanilla JS — no React, no bundler, no build step
- Chrome Extension APIs: storage, tabs, scripting, downloads
- IndexedDB for local conversation library
- Anthropic API (Claude Haiku) for handoff generation

---

## License

MIT
