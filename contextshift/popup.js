// ContextShift — Popup Logic

(async () => {
  // ─── STATE ───
  let currentPlatform = null;
  let currentConversation = null;
  let currentHandoff = null;
  let selectedFormat = 'txt';

  // ─── ELEMENTS ───
  const $ = (id) => document.getElementById(id);
  const platformBadge = $('platform-badge');
  const platformDot = $('platform-dot');
  const platformName = $('platform-name');
  const btnExport = $('btn-export');
  const btnHandoff = $('btn-handoff');
  const formatSelector = $('format-selector');
  const status = $('status');
  const handoffResult = $('handoff-result');
  const handoffText = $('handoff-text');
  const btnCopy = $('btn-copy');
  const msgCount = $('msg-count');
  const noPlatform = $('no-platform');
  const mainArea = $('main-area');
  const libraryList = $('library-list');
  const librarySearch = $('library-search');
  const apiKeyInput = $('api-key');
  const btnSaveKey = $('btn-save-key');
  const toggleQuickPaste = $('toggle-quickpaste');
  const toggleAutoExport = $('toggle-autoexport');
  const btnClearAll = $('btn-clear-all');

  // ─── PLATFORM DETECTION ───
  chrome.runtime.sendMessage({ type: 'GET_PLATFORM' }, (response) => {
    if (response && response.platform) {
      currentPlatform = response.platform;
      platformName.textContent = currentPlatform.name.toUpperCase();
      platformDot.style.background = currentPlatform.color;
      btnExport.disabled = false;
      btnHandoff.disabled = false;
    } else {
      platformName.textContent = 'NO AI DETECTED';
      platformDot.style.background = '#555';
      btnExport.disabled = true;
      btnHandoff.disabled = true;
      noPlatform.style.display = 'block';
      document.querySelector('.action-buttons').style.display = 'none';
    }
  });

  // ─── LOAD SETTINGS ───
  chrome.storage.local.get(
    ['apiKey', 'defaultFormat', 'quickPaste', 'autoExport'],
    (data) => {
      if (data.apiKey) apiKeyInput.value = '••••••••••••';
      if (data.defaultFormat) {
        selectedFormat = data.defaultFormat;
        document.querySelectorAll('input[name="format"]').forEach((r) => {
          r.checked = r.value === data.defaultFormat;
        });
      }
      toggleQuickPaste.checked = data.quickPaste || false;
      toggleAutoExport.checked = data.autoExport || false;
    }
  );

  // ─── TAB SWITCHING ───
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-tab');

      // Hide all tab content
      mainArea.style.display = target === 'main' ? 'block' : 'none';
      $('tab-library').style.display = target === 'library' ? 'block' : 'none';
      $('tab-settings').style.display = target === 'settings' ? 'block' : 'none';

      if (target === 'library') loadLibrary();
    });
  });

  // ─── EXPORT BUTTON ───
  btnExport.addEventListener('click', async () => {
    showStatus('Scraping conversation...', 'loading');
    btnExport.disabled = true;

    chrome.runtime.sendMessage({ type: 'SCRAPE_CONVERSATION' }, async (response) => {
      if (!response || response.error) {
        showStatus(response?.error || 'Failed to scrape conversation', 'error');
        btnExport.disabled = false;
        return;
      }

      if (!response.messages || response.messages.length === 0) {
        showStatus('No messages found. Make sure a conversation is open.', 'error');
        btnExport.disabled = false;
        return;
      }

      currentConversation = response;
      msgCount.textContent = `${response.messages.length} messages scraped`;
      msgCount.style.display = 'block';
      formatSelector.style.display = 'flex';

      // Get format preference
      chrome.storage.local.get('defaultFormat', (data) => {
        const format = data.defaultFormat || selectedFormat;
        exportConversation(response, format, currentHandoff);
      });

      // Save to library
      try {
        await ContextShiftDB.save(response, currentHandoff);
      } catch (e) {
        console.error('Failed to save to library:', e);
      }

      showStatus('Exported successfully!', 'success');
      btnExport.disabled = false;
    });
  });

  // ─── FORMAT BUTTONS ───
  document.querySelectorAll('.format-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.format-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFormat = btn.getAttribute('data-format');

      if (currentConversation) {
        exportConversation(currentConversation, selectedFormat, currentHandoff);
      }
    });
  });

  // ─── HANDOFF BUTTON ───
  btnHandoff.addEventListener('click', () => {
    btnHandoff.disabled = true;
    showStatus('Scraping conversation...', 'loading');

    chrome.runtime.sendMessage({ type: 'SCRAPE_CONVERSATION' }, (response) => {
      if (!response || response.error) {
        showStatus(response?.error || 'Failed to scrape', 'error');
        btnHandoff.disabled = false;
        return;
      }

      if (!response.messages || response.messages.length === 0) {
        showStatus('No messages found.', 'error');
        btnHandoff.disabled = false;
        return;
      }

      currentConversation = response;
      msgCount.textContent = `${response.messages.length} messages scraped`;
      msgCount.style.display = 'block';

      showStatus('Generating handoff prompt...', 'loading');

      chrome.storage.local.get('apiKey', (data) => {
        chrome.runtime.sendMessage(
          {
            type: 'GENERATE_HANDOFF',
            conversation: response,
            apiKey: data.apiKey,
          },
          (result) => {
            btnHandoff.disabled = false;

            if (result.error) {
              showStatus(result.error, 'error');
              return;
            }

            currentHandoff = result.handoff;
            handoffText.value = result.handoff;
            handoffResult.style.display = 'block';
            showStatus('Handoff prompt generated!', 'success');
          }
        );
      });
    });
  });

  // ─── COPY BUTTON ───
  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(handoffText.value).then(() => {
      btnCopy.textContent = 'COPIED!';
      setTimeout(() => {
        btnCopy.textContent = 'COPY';
      }, 2000);
    });
  });

  // ─── EXPORT FUNCTION ───
  function exportConversation(conversation, format, handoff) {
    const result = ContextShiftExporter.export(conversation, format, handoff);

    const blob = new Blob([result.content], { type: result.mimeType });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: result.filename,
      saveAs: false,
    });
  }

  // ─── STATUS DISPLAY ───
  function showStatus(msg, type) {
    status.textContent = msg;
    status.className = `status ${type}`;
    status.style.display = 'block';

    if (type !== 'loading') {
      setTimeout(() => {
        status.style.display = 'none';
      }, 4000);
    }
  }

  // ─── LIBRARY ───
  async function loadLibrary(query) {
    try {
      const items = query
        ? await ContextShiftDB.search(query)
        : await ContextShiftDB.getAll(10);

      if (items.length === 0) {
        libraryList.innerHTML =
          '<div class="library-empty">No exported conversations yet.</div>';
        return;
      }

      libraryList.innerHTML = items
        .map(
          (item) => `
        <div class="library-item" data-id="${item.id}">
          <span class="library-item-platform">${item.platform}</span>
          <div class="library-item-info">
            <div class="library-item-preview">${escapeHtml(item.firstMessage)}</div>
            <div class="library-item-meta">${formatDate(item.date)} · ${item.messageCount} msgs</div>
          </div>
          <div class="library-item-actions">
            <button class="library-item-btn reexport" data-id="${item.id}" title="Re-export">&#x2193;</button>
            <button class="library-item-btn delete" data-id="${item.id}" title="Delete">&#x2715;</button>
          </div>
        </div>
      `
        )
        .join('');

      // Re-export buttons
      libraryList.querySelectorAll('.reexport').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const item = await ContextShiftDB.get(id);
          if (item) {
            const conv = {
              platform: item.platform,
              messages: item.messages,
            };
            exportConversation(conv, selectedFormat, item.handoff);
          }
        });
      });

      // Delete buttons
      libraryList.querySelectorAll('.delete').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          await ContextShiftDB.delete(id);
          loadLibrary(librarySearch.value);
        });
      });
    } catch (e) {
      libraryList.innerHTML =
        '<div class="library-empty">Error loading library.</div>';
    }
  }

  // Library search
  let searchTimeout;
  librarySearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadLibrary(librarySearch.value);
    }, 300);
  });

  // ─── SETTINGS ───
  btnSaveKey.addEventListener('click', () => {
    const key = apiKeyInput.value;
    if (key && !key.startsWith('••')) {
      chrome.storage.local.set({ apiKey: key }, () => {
        apiKeyInput.value = '••••••••••••';
        showSettingStatus(btnSaveKey, 'SAVED!');
      });
    }
  });

  document.querySelectorAll('input[name="format"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      chrome.storage.local.set({ defaultFormat: radio.value });
      selectedFormat = radio.value;
    });
  });

  toggleQuickPaste.addEventListener('change', () => {
    chrome.storage.local.set({ quickPaste: toggleQuickPaste.checked });
  });

  toggleAutoExport.addEventListener('change', () => {
    chrome.storage.local.set({ autoExport: toggleAutoExport.checked });
  });

  btnClearAll.addEventListener('click', async () => {
    if (confirm('Delete all saved conversations? This cannot be undone.')) {
      await ContextShiftDB.clearAll();
      showSettingStatus(btnClearAll, 'CLEARED');
    }
  });

  function showSettingStatus(btn, text) {
    const original = btn.textContent;
    btn.textContent = text;
    setTimeout(() => {
      btn.textContent = original;
    }, 2000);
  }

  // ─── HELPERS ───
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
})();
