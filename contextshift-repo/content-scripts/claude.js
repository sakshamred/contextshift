// ContextShift — Claude.ai Content Script

(() => {
  function scrapeConversation() {
    const messages = [];

    // Try multiple selector strategies for Claude
    const turns = document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"]');

    if (turns.length > 0) {
      turns.forEach((el) => {
        const isUser = el.getAttribute('data-testid') === 'user-message';
        const role = isUser ? 'user' : 'assistant';
        const content = extractText(el);
        const imgInfo = checkImages(el);
        if (content.trim()) {
          messages.push({ role, content, ...imgInfo });
        }
      });
    } else {
      // Fallback: try conversation turn containers
      const turnContainers = document.querySelectorAll('.font-claude-message, .font-user-message, [class*="ConversationTurn"], [class*="Message"]');
      
      if (turnContainers.length === 0) {
        // Deep fallback: look for the main conversation area and parse alternating blocks
        const conversationArea = document.querySelector('[class*="conversation"], [class*="chat"], main, [role="main"]');
        if (conversationArea) {
          // Try to find human/assistant patterns
          const humanBlocks = conversationArea.querySelectorAll('[class*="human"], [class*="user"], [class*="Human"]');
          const assistantBlocks = conversationArea.querySelectorAll('[class*="assistant"], [class*="claude"], [class*="Assistant"], [class*="response"]');
          
          humanBlocks.forEach((el) => {
            const content = extractText(el);
            if (content.trim()) messages.push({ role: 'user', content, ...checkImages(el) });
          });
          
          assistantBlocks.forEach((el) => {
            const content = extractText(el);
            if (content.trim()) messages.push({ role: 'assistant', content, ...checkImages(el) });
          });
        }
      } else {
        turnContainers.forEach((el) => {
          const classList = el.className || '';
          const isUser = classList.includes('user') || classList.includes('human') || classList.includes('Human');
          const role = isUser ? 'user' : 'assistant';
          const content = extractText(el);
          if (content.trim()) messages.push({ role, content, ...checkImages(el) });
        });
      }
    }

    return {
      platform: 'Claude',
      messages,
      url: window.location.href,
      scrapedAt: new Date().toISOString(),
    };
  }

  function extractText(el) {
    const clone = el.cloneNode(true);

    // Handle code blocks
    clone.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      const langClass = code?.className || '';
      const lang = langClass.match(/language-(\w+)/)?.[1] || '';
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

  // Listen for scrape requests
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
