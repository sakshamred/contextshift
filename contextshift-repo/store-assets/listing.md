# Chrome Web Store Listing

## Name
ContextShift — AI Conversation Exporter & Context Bridge

## Short Description (132 chars max)
Export conversations from any AI. Generate handoff prompts to continue seamlessly in another AI. Your context travels with you.

## Detailed Description

CONTEXTSHIFT — Carry your context anywhere.

You're deep in a conversation with Claude. Tokens run out. You want GPT's opinion. You switch to Gemini for search grounding. Every time you switch, you lose everything — the context, the decisions, the code, the direction.

ContextShift fixes this. One click exports your entire conversation. One more click generates a handoff prompt — a perfectly formatted summary you paste into any other AI to continue exactly where you left off.

━━━ SUPPORTED PLATFORMS ━━━
• Claude (claude.ai)
• ChatGPT (chat.openai.com / chatgpt.com)
• Gemini (gemini.google.com)
• Grok (grok.com)
• Perplexity (perplexity.ai)
• Phind (phind.com)
• You.com

━━━ FEATURES ━━━

EXPORT CONVERSATIONS
• Export as .txt, .md, or .json
• Code blocks preserved with language labels
• Images tagged automatically
• Smart file naming

GENERATE HANDOFF PROMPTS
• AI-powered context summaries (uses your own Anthropic API key)
• Covers: what was built, decisions made, current state, next steps
• One-click copy to clipboard
• Appended to exports automatically

CONVERSATION LIBRARY
• All exports stored locally
• Search by keyword
• Re-export or regenerate from any saved conversation

QUICK PASTE MODE
• Detects when you open a new AI tab
• Offers to paste your last handoff prompt automatically

━━━ PRIVACY ━━━
• ZERO servers — all data stays in your browser
• ZERO telemetry — no analytics, no tracking
• ZERO accounts — no login required
• Your API key never leaves chrome.storage.local
• Open source — audit every line

Built for developers who use multiple AI tools daily.

## Category
Productivity

## Language
English

## Website
(your GitHub repo URL)

## Single Purpose Description
Exports AI chat conversations and generates context handoff prompts for seamless switching between AI platforms.

## Permissions Justification

| Permission | Justification |
|-----------|---------------|
| storage | Store user settings (API key, preferences) and conversation library locally |
| tabs | Detect which AI platform the user is currently on |
| scripting | Inject content scripts to scrape conversation content from AI platforms |
| downloads | Download exported conversation files to user's computer |
| activeTab | Access the current tab to scrape the active conversation |
| Host permissions | Required to run content scripts on supported AI platform domains |

## Privacy Policy URL
https://YOUR_USERNAME.github.io/contextshift/privacy-policy.html

## Privacy Practices
- Does not collect user data
- Does not transmit data to any server (except Anthropic API for handoff generation, using user's own key)
- Does not use analytics or tracking
- All data stored locally in the browser
