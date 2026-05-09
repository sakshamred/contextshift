// ContextShift — Gemini Content Script

(() => {
  function scrapeConversation() {
    const messages = [];

    // Try primary selectors
    const userMsgs = document.querySelectorAll('.user-query-text, [data-message-author="user"], .query-text, message-content.user-message');
    const aiMsgs = document.querySelectorAll('.model-response-text, [data-message-author="model"], .response-text, message-content.model-response');

    if (userMsgs.length > 0 || aiMsgs.length > 0) {
      // Interleave based on DOM position
      const allElements = [];
      userMsgs.forEach((el) => allElements.push({ el, role: 'user' }));
      aiMsgs.forEach((el) => allElements.push({ el, role: 'assistant' }));

      // Sort by DOM position
      allElements.sort((a, b) => {
        const pos = a.el.compareDocumentPosition(b.el);
        return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

      allElements.forEach(({ el, role }) => {
        const content = extractText(el);
        if (content.trim()) {
          messages.push({ role, content, ...checkImages(el) });
        }
      });
    } else {
      // Fallback: conversation turns
      const turns = document.querySelectorAll('[class*="conversation-turn"], [class*="turn-container"], .chat-turn');
      turns.forEach((turn, i) => {
        const role = i % 2 === 0 ? 'user' : 'assistant';
        const content = extractText(turn);
        if (content.trim()) {
          messages.push({ role, content, ...checkImages(turn) });
        }
      });
    }

    return {
      platform: 'Gemini',
      messages,
      url: window.location.href,
      scrapedAt: new Date().toISOString(),
    };
  }

  function extractText(el) {
    const clone = el.cloneNode(true);

    // Remove action buttons
    clone.querySelectorAll('button, [class*="action"], [class*="toolbar"]').forEach((b) => b.remove());

    clone.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
      const codeText = (code || pre).textContent;
      pre.replaceWith(document.createTextNode(`\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`));
    });

    clone.querySelectorAll('code').forEach((code) => {
      if (!code.closest('pre')) {
        code.replaceWith(document.createTextNode(`\`${code.textContent}\``));
      }
    });

    clone.querySelectorAll('li').forEach((li) => {
      const parent = li.parentElement;
      const index = Array.from(parent.children).indexOf(li);
      const prefix = parent.tagName === 'OL' ? `${index + 1}. ` : '- ';
      li.prepend(document.createTextNode(prefix));
      li.append(document.createTextNode('\n'));
    });

    clone.querySelectorAll('strong, b').forEach((el) => {
      el.prepend(document.createTextNode('**'));
      el.append(document.createTextNode('**'));
    });

    return clone.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }

  function checkImages(el) {
    const images = el.querySelectorAll('img');
    if (images.length > 0) {
      const alts = Array.from(images).map((img) => img.alt).filter(Boolean);
      return { hasImage: true, imageAlt: alts.join(', ') || null };
    }
    return { hasImage: false, imageAlt: null };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCRAPE') {
      try {
        const conversation = scrapeConversation();
        sendResponse(conversation);
      } catch (err) {
        sendResponse({ error: err.message });
      }
    }
    return true;
  });
})();
