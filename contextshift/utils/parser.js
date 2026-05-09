// ContextShift — Shared parsing logic

const ContextShiftParser = {
  /**
   * Normalize scraped messages into a standard format
   */
  normalizeMessages(rawMessages) {
    return rawMessages
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m, i) => ({
        index: i,
        role: m.role, // 'user' or 'assistant'
        content: this.cleanContent(m.content),
        hasCode: m.content.includes('```'),
        hasImage: m.hasImage || false,
        imageAlt: m.imageAlt || null,
        timestamp: m.timestamp || null,
      }));
  },

  /**
   * Clean up scraped text content
   */
  cleanContent(text) {
    return text
      .replace(/\n{3,}/g, '\n\n') // collapse excessive newlines
      .replace(/[ \t]+$/gm, '') // trim trailing whitespace per line
      .trim();
  },

  /**
   * Extract text content from a DOM element, preserving code blocks
   */
  extractTextFromElement(el) {
    const clone = el.cloneNode(true);
    const parts = [];

    // Process code blocks first
    clone.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      const lang =
        code?.className?.match(/language-(\w+)/)?.[1] ||
        pre.querySelector('[class*="lang"]')?.textContent?.trim() ||
        '';
      const codeText = (code || pre).textContent;
      const marker = `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`;
      pre.replaceWith(document.createTextNode(marker));
    });

    // Process inline code
    clone.querySelectorAll('code').forEach((code) => {
      if (!code.closest('pre')) {
        code.replaceWith(document.createTextNode(`\`${code.textContent}\``));
      }
    });

    // Process lists
    clone.querySelectorAll('li').forEach((li) => {
      const parent = li.parentElement;
      const index = Array.from(parent.children).indexOf(li);
      const prefix = parent.tagName === 'OL' ? `${index + 1}. ` : '- ';
      li.prepend(document.createTextNode(prefix));
      li.append(document.createTextNode('\n'));
    });

    // Process headings
    clone.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      const level = parseInt(h.tagName[1]);
      const prefix = '#'.repeat(level) + ' ';
      h.prepend(document.createTextNode('\n' + prefix));
      h.append(document.createTextNode('\n'));
    });

    // Process bold/strong
    clone.querySelectorAll('strong, b').forEach((el) => {
      el.prepend(document.createTextNode('**'));
      el.append(document.createTextNode('**'));
    });

    // Process italic/em
    clone.querySelectorAll('em, i').forEach((el) => {
      if (!el.closest('strong') && !el.closest('b')) {
        el.prepend(document.createTextNode('*'));
        el.append(document.createTextNode('*'));
      }
    });

    // Process blockquotes
    clone.querySelectorAll('blockquote').forEach((bq) => {
      const text = bq.textContent;
      bq.replaceWith(
        document.createTextNode(
          '\n' +
            text
              .split('\n')
              .map((l) => '> ' + l)
              .join('\n') +
            '\n'
        )
      );
    });

    return clone.textContent;
  },

  /**
   * Check for images in a message element
   */
  checkForImages(el) {
    const images = el.querySelectorAll('img');
    const result = { hasImage: false, imageAlt: null };
    if (images.length > 0) {
      result.hasImage = true;
      const alts = Array.from(images)
        .map((img) => img.alt)
        .filter(Boolean);
      result.imageAlt = alts.length > 0 ? alts.join(', ') : null;
    }
    return result;
  },

  /**
   * Detect platform from current URL
   */
  detectPlatform() {
    const hostname = window.location.hostname;
    const platformMap = {
      'claude.ai': 'Claude',
      'chat.openai.com': 'ChatGPT',
      'chatgpt.com': 'ChatGPT',
      'gemini.google.com': 'Gemini',
      'grok.com': 'Grok',
      'www.perplexity.ai': 'Perplexity',
      'www.phind.com': 'Phind',
      'you.com': 'You.com',
    };
    return platformMap[hostname] || 'Unknown';
  },
};

// Export for content scripts
if (typeof window !== 'undefined') {
  window.ContextShiftParser = ContextShiftParser;
}
