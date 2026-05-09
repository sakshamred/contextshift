// ContextShift — Service Worker (Background)

const SUPPORTED_PLATFORMS = {
  'claude.ai': { name: 'Claude', color: '#D97757' },
  'chat.openai.com': { name: 'ChatGPT', color: '#10A37F' },
  'chatgpt.com': { name: 'ChatGPT', color: '#10A37F' },
  'gemini.google.com': { name: 'Gemini', color: '#4285F4' },
  'grok.com': { name: 'Grok', color: '#FFFFFF' },
  'www.perplexity.ai': { name: 'Perplexity', color: '#20B8CD' },
  'www.phind.com': { name: 'Phind', color: '#6C5CE7' },
  'you.com': { name: 'You.com', color: '#7B61FF' },
};

function getPlatformFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return SUPPORTED_PLATFORMS[hostname] || null;
  } catch {
    return null;
  }
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PLATFORM') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const platform = getPlatformFromUrl(tabs[0].url);
        sendResponse({ platform, tabId: tabs[0].id });
      } else {
        sendResponse({ platform: null });
      }
    });
    return true;
  }

  if (message.type === 'SCRAPE_CONVERSATION') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SCRAPE' }, (response) => {
          sendResponse(response);
        });
      } else {
        sendResponse({ error: 'No active tab' });
      }
    });
    return true;
  }

  if (message.type === 'GENERATE_HANDOFF') {
    generateHandoff(message.conversation, message.apiKey)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'PASTE_CONTEXT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'PASTE',
          text: message.text,
        });
        sendResponse({ ok: true });
      }
    });
    return true;
  }

  if (message.type === 'GET_LAST_HANDOFF') {
    chrome.storage.local.get('lastHandoff', (data) => {
      sendResponse({ handoff: data.lastHandoff || null });
    });
    return true;
  }
});

async function generateHandoff(conversation, apiKey) {
  if (!apiKey) {
    return { error: 'No API key configured. Add your Anthropic key in Settings.' };
  }

  const conversationText = conversation.messages
    .map((m) => `[${m.role === 'user' ? 'YOU' : 'AI'}]\n${m.content}`)
    .join('\n\n');

  const truncated =
    conversationText.length > 80000
      ? conversationText.slice(-80000)
      : conversationText;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20241022',
        max_tokens: 1024,
        system:
          'You are a context bridge. Read this AI conversation and generate a handoff prompt that lets a different AI continue it seamlessly. Include: what was being built/discussed, key decisions already made, current state/progress, what was about to happen next, any important constraints or preferences the user expressed. Be dense and specific. Format it so it can be pasted directly as the first message in a new AI chat. Max 600 words.',
        messages: [
          {
            role: 'user',
            content: `Here is the conversation from ${conversation.platform}:\n\n${truncated}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return {
        error: err.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const handoffText = data.content[0].text;

    // Store as last handoff
    chrome.storage.local.set({
      lastHandoff: {
        text: handoffText,
        platform: conversation.platform,
        date: new Date().toISOString(),
      },
    });

    return { handoff: handoffText };
  } catch (err) {
    return { error: `Network error: ${err.message}` };
  }
}
