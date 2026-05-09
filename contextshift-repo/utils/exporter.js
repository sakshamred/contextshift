// ContextShift — File generation logic

const ContextShiftExporter = {
  /**
   * Generate filename: contextshift_[platform]_[date]_[first 5 words].ext
   */
  generateFilename(conversation, format) {
    const platform = conversation.platform.toLowerCase().replace(/[^a-z]/g, '');
    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    const firstMsg = conversation.messages[0]?.content || 'conversation';
    const slug = firstMsg
      .split(/\s+/)
      .slice(0, 5)
      .join('_')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 50);
    return `contextshift_${platform}_${date}_${slug}.${format}`;
  },

  /**
   * Format as plain text
   */
  toText(conversation, handoff) {
    const header = [
      '═══════════════════════════════════',
      'CONTEXTSHIFT EXPORT',
      `Platform: ${conversation.platform}`,
      `Date: ${new Date().toLocaleString()}`,
      `Messages: ${conversation.messages.length}`,
      '═══════════════════════════════════',
      '',
    ].join('\n');

    const body = conversation.messages
      .map((m) => {
        const role =
          m.role === 'user'
            ? '[YOU]'
            : `[${conversation.platform.toUpperCase()}]`;
        let content = m.content;
        if (m.hasImage) {
          content =
            `[IMAGE ATTACHED${m.imageAlt ? ': ' + m.imageAlt : ''}]\n` +
            content;
        }
        return `${role}\n${content}`;
      })
      .join('\n\n');

    let result = header + body;

    if (handoff) {
      result += [
        '',
        '',
        '═══════════════════════════════════',
        'HANDOFF PROMPT (paste this into any AI)',
        '═══════════════════════════════════',
        '',
        handoff,
      ].join('\n');
    }

    return result;
  },

  /**
   * Format as markdown
   */
  toMarkdown(conversation, handoff) {
    const header = [
      '# ContextShift Export',
      '',
      `| Field | Value |`,
      `|-------|-------|`,
      `| Platform | ${conversation.platform} |`,
      `| Date | ${new Date().toLocaleString()} |`,
      `| Messages | ${conversation.messages.length} |`,
      '',
      '---',
      '',
    ].join('\n');

    const body = conversation.messages
      .map((m) => {
        const role =
          m.role === 'user'
            ? '**YOU**'
            : `**${conversation.platform.toUpperCase()}**`;
        let content = m.content;
        if (m.hasImage) {
          content =
            `> *[IMAGE ATTACHED${m.imageAlt ? ': ' + m.imageAlt : ''}]*\n\n` +
            content;
        }
        return `### ${role}\n\n${content}`;
      })
      .join('\n\n---\n\n');

    let result = header + body;

    if (handoff) {
      result += [
        '',
        '',
        '---',
        '',
        '## Handoff Prompt',
        '',
        '> Paste this into any AI to continue the conversation.',
        '',
        handoff,
      ].join('\n');
    }

    return result;
  },

  /**
   * Format as JSON
   */
  toJSON(conversation, handoff) {
    return JSON.stringify(
      {
        exportedBy: 'ContextShift',
        version: '1.0.0',
        platform: conversation.platform,
        exportDate: new Date().toISOString(),
        messageCount: conversation.messages.length,
        messages: conversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
          hasImage: m.hasImage || false,
          imageAlt: m.imageAlt || null,
          timestamp: m.timestamp || null,
        })),
        handoffPrompt: handoff || null,
      },
      null,
      2
    );
  },

  /**
   * Export conversation to file
   */
  export(conversation, format, handoff) {
    const formatters = {
      txt: this.toText,
      md: this.toMarkdown,
      json: this.toJSON,
    };

    const formatter = formatters[format] || formatters.txt;
    const content = formatter(conversation, handoff);
    const filename = this.generateFilename(conversation, format);
    const mimeTypes = {
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
    };

    return { content, filename, mimeType: mimeTypes[format] || 'text/plain' };
  },
};

if (typeof window !== 'undefined') {
  window.ContextShiftExporter = ContextShiftExporter;
}
