// ContextShift — ChatGPT Content Script

(() => {
  function scrapeConversation() {
    const messages = [];

    // Primary selectors
    const userMsgs = document.querySelectorAll('[data-message-author-role="user"]');
    const assistantMsgs = document.querySelectorAll('[data-message-author-role="assistant"]');

    if (userMsgs.length > 0 || assistantMsgs.length > 0) {
      // Get all messages in DOM order
      const allMsgs = document.querySelectorAll('[data-message-author-role]');
      allMsgs.forEach((el) => {
        const role = el.getAttribute('data-message-author-role');
        if (role === 'user' || role === 'assistant') {
          const content = extractText(el);
          if (content.trim()) {
            messages.push({
              role: role === 'user' ? 'user' : 'assistant',
              content,
              ...checkImages(el),
            });
          }
        }
      });
    } else {
      // Fallback: try article-based structure
      const articles = document.querySelectorAll('article, [data-testid*="conversation-turn"]');
      articles.forEach((article, i) => {
        const role = i % 2 === 0 ? 'user' : 'assistant';
        const content = extractText(article);
        if (content.trim()) {
          messages.push({ role, content, ...checkImages(article) });
        }
      });
    }

    return {
      platform: 'ChatGPT',
      messages,
      url: window.location.href,
      scrapedAt: new Date().toISOString(),
    };
  }

  function extractText(el) {
    const clone = el.cloneNode(true);

    // Remove button elements (copy buttons, etc.)
    clone.querySelectorAll('button, [class*="copy"], [class*="action"]').forEach((b) => b.remove());

    clone.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      const langSpan = pre.querySelector('[class*="lang"], span');
      const lang = code?.className?.match(/language-(\w+)/)?.[1] ||
        (langSpan && !langSpan.querySelector('*') ? langSpan.textContent.trim() : '') || '';
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
