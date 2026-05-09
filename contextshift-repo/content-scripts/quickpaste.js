// ContextShift — Quick Paste Mode

(() => {
  let bubble = null;

  async function init() {
    // Check if quick paste is enabled
    const settings = await chrome.storage.local.get(['quickPaste', 'lastHandoff']);
    if (!settings.quickPaste) return;
    if (!settings.lastHandoff) return;

    const handoff = settings.lastHandoff;
    const timeDiff = Date.now() - new Date(handoff.date).getTime();
    // Only show if last handoff was within 24 hours
    if (timeDiff > 24 * 60 * 60 * 1000) return;

    // Wait for the page to fully load
    setTimeout(() => {
      showBubble(handoff);
    }, 2000);
  }

  function showBubble(handoff) {
    if (bubble) return;

    bubble = document.createElement('div');
    bubble.id = 'contextshift-quickpaste';
    bubble.innerHTML = `
      <div class="cs-bubble-inner">
        <span class="cs-bubble-icon">\u{1F4CB}</span>
        <span class="cs-bubble-text">Paste context from last session?</span>
        <span class="cs-bubble-platform">${handoff.platform}</span>
        <button class="cs-bubble-paste" id="cs-paste-btn">PASTE</button>
        <button class="cs-bubble-dismiss" id="cs-dismiss-btn">\u{2715}</button>
      </div>
    `;

    document.body.appendChild(bubble);

    document.getElementById('cs-paste-btn').addEventListener('click', () => {
      pasteIntoInput(handoff.text);
      removeBubble();
    });

    document.getElementById('cs-dismiss-btn').addEventListener('click', () => {
      removeBubble();
    });

    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      removeBubble();
    }, 30000);
  }

  function removeBubble() {
    if (bubble && bubble.parentNode) {
      bubble.classList.add('cs-bubble-exit');
      setTimeout(() => {
        bubble.remove();
        bubble = null;
      }, 300);
    }
  }

  function pasteIntoInput(text) {
    // Try common input selectors across platforms
    const selectors = [
      'textarea',
      '[contenteditable="true"]',
      'div[role="textbox"]',
      '.ProseMirror',
      '[class*="input"]',
      '[class*="composer"]',
      '[class*="editor"]',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.focus();
        } else {
          // contenteditable
          el.focus();
          el.textContent = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return;
      }
    }
  }

  // Handle paste messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PASTE') {
      pasteIntoInput(message.text);
      sendResponse({ ok: true });
    }
    return true;
  });

  init();
})();
