// Lazy-load @n8n/chat at runtime to support bundling and CDN usage
let __createChatPromise;
async function ensureCreateChat() {
  if (typeof window !== 'undefined' && window.__n8nCreateChat) return window.__n8nCreateChat;
  if (!__createChatPromise) {
    __createChatPromise = import('https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js')
      .then((m) => m.createChat)
      .catch((e) => {
        console.error('[n8n-chat] failed to load @n8n/chat from CDN', e);
        throw e;
      });
  }
  return __createChatPromise;
}

export async function initDocsifyN8nChat() {
  if (window.__n8nChatInited) {
    console.info('[n8n-chat] adapter already initialized, skipping');
    return;
  }
  window.__n8nChatInited = true;
  console.info('[n8n-chat] adapter boot');
  const cfg = (window.$docsify && window.$docsify.n8nChat) || {};
  if (!cfg.webhookUrl) {
    console.warn('[docsify-n8n-chat-adapter] Missing webhookUrl in $docsify.n8nChat');
    return;
  }

  // Ensure target container exists
  const target = document.getElementById('n8n-chat') || (function(){
    const el = document.createElement('div');
    el.id = 'n8n-chat';
    document.body.appendChild(el);
    return el;
  })();

  // Optional positioning helpers
  const root = document.getElementById('n8n-chat-root') || (function(){
    const el = document.createElement('div');
    el.id = 'n8n-chat-root';
    document.body.appendChild(el);
    return el;
  })();
  if (cfg.position === 'left') root.classList.add('n8n-left');
  if (cfg.iconUrl) root.classList.add('n8n-custom-icon');

  // Persist open/closed state
  const openKey = `${cfg.storageKey || 'n8nchat'}:open`;
  const storageNS = cfg.storageKey || 'n8nchat';
  // Manual session management workaround for @n8n/chat bug (#18270):
  // Persist a stable session id and always pass it via metadata so memory nodes can restore context.
  const sidKey = `${storageNS}:sid`;
  let persistentSid;
  try {
    persistentSid = localStorage.getItem(sidKey);
  } catch {}
  if (!persistentSid) {
    try {
      persistentSid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(sidKey, persistentSid);
    } catch {
      // Fallback to an in-memory id if storage is unavailable
      persistentSid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }
  const messagesKey = `${storageNS}:messages`;
  // New: persist rendered HTML to keep original formatting intact
  const messagesHtmlKey = `${storageNS}:messages_html_v2`;
  const persistUI = cfg.persistUI !== false; // default true
  const storedOpen = (() => { try { return JSON.parse(localStorage.getItem(openKey)); } catch { return null; } })();
  let desiredOpen = (typeof storedOpen === 'boolean') ? storedOpen : !!cfg.defaultOpen;

  // Load locally persisted messages to rehydrate UI
  const loadInitialMessages = () => {
    if (!persistUI) return cfg.initialMessages || (cfg.welcome ? [cfg.welcome] : undefined);
    // If we have HTML cache, we will rehydrate the UI directly and should not return initialMessages
    try {
      const rawHtml = localStorage.getItem(messagesHtmlKey);
      const arrHtml = rawHtml ? JSON.parse(rawHtml) : null;
      if (Array.isArray(arrHtml) && arrHtml.length) {
        return cfg.initialMessages || (cfg.welcome ? undefined : undefined);
      }
    } catch {}
    try {
      const raw = localStorage.getItem(messagesKey);
      if (!raw) return cfg.initialMessages || (cfg.welcome ? [cfg.welcome] : undefined);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        // Ensure we return an array of strings to the widget
        const strings = parsed.map((m) => {
          if (typeof m === 'string') return m;
          if (m && typeof m.text === 'string') return m.text;
          return m != null ? String(m) : '';
        }).filter(Boolean);
        if (strings.length) {
          // Write back migrated format to avoid future issues
          try { localStorage.setItem(messagesKey, JSON.stringify(strings)); } catch {}
          console.info('[n8n-chat] restoring', strings.length, 'messages from UI cache');
          return strings;
        }
      }
    } catch (e) {
      console.warn('[n8n-chat] failed to parse cached messages, clearing cache', e);
      try { localStorage.removeItem(messagesKey); } catch {}
    }
    return cfg.initialMessages || (cfg.welcome ? [cfg.welcome] : undefined);
  };

  const sessionKeyName = cfg.chatSessionKey || 'sessionId';
  // Initialize chat widget (simple, direct init)
  try {
    const initialMessages = loadInitialMessages();
    console.info('[n8n-chat] passing initialMessages to createChat:', initialMessages);
    const createChat = await ensureCreateChat();
    createChat({
      webhookUrl: cfg.webhookUrl,
      webhookConfig: cfg.webhookConfig || { method: 'POST', headers: {} },
      target: '#n8n-chat',
      mode: 'window',
      chatInputKey: cfg.chatInputKey || 'chatInput',
      // Workaround: disable built-in previous session loader due to bug generating new IDs each load
      loadPreviousSession: false,
      chatSessionKey: sessionKeyName,
      // Always pass a stable session id in metadata so n8n memory nodes can restore context
      metadata: { ...(cfg.extraPayload || {}), [sessionKeyName]: persistentSid },
      showWelcomeScreen: false,
      defaultLanguage: cfg.defaultLanguage || 'en',
      initialMessages,
      i18n: cfg.i18n,
      enableStreaming: !!cfg.enableStreaming,
      // Expose and default to false to avoid unintended auto-starts when managing sessions manually
      autoStartConversation: !!cfg.autoStartConversation,
    });
  } catch (e) {
    console.error('[n8n-chat] createChat failed', e);
  }

  // Apply custom launcher icon if provided
  const applyIcon = () => {
    const btn = document.querySelector('.chat__toggle');
    if (!btn) return false;
    if (cfg.iconUrl) {
      btn.style.backgroundImage = `url(${cfg.iconUrl})`;
    }
    return true;
  };
  const obs = new MutationObserver(() => { if (applyIcon()) obs.disconnect(); });
  if (!applyIcon()) obs.observe(document.body, { childList: true, subtree: true });

  // Apply desired open state once and persist on user toggle
  const applyOpenState = () => {
    const btn = document.querySelector('.chat__toggle');
    if (!btn) return false;
    if (desiredOpen) btn.click();
    let openState = desiredOpen;
    btn.addEventListener('click', () => {
      openState = !openState;
      try { localStorage.setItem(openKey, JSON.stringify(openState)); } catch {}
    });
    return true;
  };
  const obs2 = new MutationObserver(() => { if (applyOpenState()) obs2.disconnect(); });
  if (!applyOpenState()) obs2.observe(document.body, { childList: true, subtree: true });

  // UI persistence: observe message list and store transcript locally
  if (persistUI) {
    const serializeMessages = () => {
      const nodes = document.querySelectorAll('.chat-messages-list .chat-message');
      const outText = [];
      const outHtml = [];
      nodes.forEach((el) => {
        // Text fallback for legacy key (kept for backward compatibility)
        const md = el.querySelector('.chat-message-markdown');
        let text = md ? md.innerText : el.innerText;
        text = (text || '').replace(/\s+$/g, '').replace(/^\s+/g, '');
        if (text) outText.push(text);
        // New: keep exact rendered HTML to preserve formatting
        outHtml.push(el.outerHTML);
      });
      try { localStorage.setItem(messagesKey, JSON.stringify(outText.slice(-200))); } catch {}
      try { localStorage.setItem(messagesHtmlKey, JSON.stringify(outHtml.slice(-200))); } catch {}
      console.info('[n8n-chat] saved transcript size (text/html):', outText.length, '/', outHtml.length);
    };

    // Throttle saves to avoid excessive writes during streaming
    let saveTimer = null;
    const scheduleSave = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(serializeMessages, 250);
    };

    const msgObs = new MutationObserver(scheduleSave);

    const mountObserver = new MutationObserver(() => {
      const list = document.querySelector('.chat-messages-list');
      if (!list) return;
      msgObs.observe(list, { childList: true, subtree: true });
      // If HTML cache exists, rehydrate the UI with preserved formatting
      try {
        const rawHtml = localStorage.getItem(messagesHtmlKey);
        const arrHtml = rawHtml ? JSON.parse(rawHtml) : null;
        if (Array.isArray(arrHtml) && arrHtml.length) {
          list.innerHTML = arrHtml.join('');
          // ensure we persist this state immediately
          serializeMessages();
          // Attempt to scroll to bottom after short delay
          setTimeout(() => {
            try {
              const container = list.parentElement || list;
              container.scrollTop = container.scrollHeight;
            } catch {}
          }, 50);
        } else {
          // Capture initial state too when no cache
          serializeMessages();
        }
      } catch {
        // Fallback: just capture whatever is there
        serializeMessages();
      }
      mountObserver.disconnect();
    });
    // Wait until widget renders
    mountObserver.observe(document.body, { childList: true, subtree: true });

    // Also save when user clicks send
    const clickObs = new MutationObserver(() => {
      const sendBtn = document.querySelector('.chat-input-send-button');
      if (!sendBtn) return;
      sendBtn.addEventListener('click', () => {
        scheduleSave();
      });
      clickObs.disconnect();
    });
    clickObs.observe(document.body, { childList: true, subtree: true });
  }

  // Reset session button: clears session, input, messages and reloads
  const addResetButton = () => {
    const header = document.querySelector('.chat-header');
    if (!header) return false;
    if (header.querySelector('.chat-reset-button')) return true;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chat-reset-button';
    const lang = cfg.defaultLanguage || 'en';
    const newChatLabel = (cfg.i18n?.[lang]?.new_chat_message) || 'New chat';
    btn.setAttribute('aria-label', newChatLabel);
    btn.innerHTML = `
      <span class="label">${newChatLabel}</span>`;
    btn.addEventListener('click', () => {
      try {
        localStorage.removeItem(messagesKey);
        localStorage.removeItem(messagesHtmlKey);
        localStorage.removeItem(sidKey);
      } catch {}
      location.reload();
    });
    // Insert on the right of header
    header.appendChild(btn);
    return true;
  };
  const resetObs = new MutationObserver(() => { if (addResetButton()) resetObs.disconnect(); });
  if (!addResetButton()) resetObs.observe(document.body, { childList: true, subtree: true });
}

// Auto-init in browser when loaded as a module before Docsify core
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') initDocsifyN8nChat();
  else window.addEventListener('load', () => { initDocsifyN8nChat(); });
}
