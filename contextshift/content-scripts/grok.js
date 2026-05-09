// ContextShift — Grok Content Script

(() => {
  function scrapeConversation() {
    const messages = [];

    // Grok uses various message containers
    const turns = document.querySelectorAll('[class*="message"], [class*="turn"], [class*="Message"]');

    if (turns.length > 0) {
      turns.forEach((turn) => {
        const classList = (turn.className || '').toLowerCase();
        const isUser =
          classList.includes('user') ||
          classList.includes('human') ||
          turn.querySelector('[class*="user"], [class*="human"]');
        const role = isUser ? 'user' : 'assistant';
        const content = extractText(turn);
        if (content.trim() && content.length > 2) {
          messages.push({ role, content, ...checkImages(turn) });
        }
      });
    } else {
      // Fallback: try to find conversation container
      const container = document.querySelector('[class*="conversation"], [class*="chat"], main');
      if (container) {
        const blocks = container.querySelectorAll('[class*="prose"], [class*="content"], p');
        blocks.forEach((block, i) => {
          const role = i % 2 === 0 ? 'user' : 'assistant';
          const content = extractText(block);
          if (content.trim()) {
            messages.push({ role, content, ...checkImages(block) });
          }
        });
      }
    }

    return {
      platform: 'Grok',
      messages,
      url: window.location.href,
      scrapedAt: new Date().toISOString(),
    };
  }

  function extractText(el) {
    const clone = el.cloneNode(true);

    clone.querySelectorAll('button, [class*="action"]').forEach((b) => b.remove());

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
