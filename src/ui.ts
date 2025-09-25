import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ChatConfig, ChatMessage, ChatStore, ChatClient } from './types';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function renderMarkdown(text: string): string {
  // Default renderer: real markdown via marked + sanitize with DOMPurify
  // Fallback to plain text + <br/> if anything goes wrong
  try {
    const html = marked.parse(text ?? '');
    // DOMPurify expects window document in browser environments
    return DOMPurify.sanitize(typeof html === 'string' ? html : String(html));
  } catch {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML.replace(/\n/g, '<br/>' );
  }
}

export interface ChatUIOptions {
  containerId?: string;
}

export class ChatUI {
  private root!: HTMLElement;
  private bodyEl!: HTMLElement;
  private listEl!: HTMLElement;
  private textarea!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private toggleBtn!: HTMLDivElement;
  private resetBtn!: HTMLButtonElement;
  private typingEl: HTMLElement | null = null;

  constructor(
    private readonly store: ChatStore,
    private readonly client: ChatClient,
    private readonly config: ChatConfig,
    private readonly opts: ChatUIOptions = {}
  ) {}

  mount(parent: HTMLElement = document.body) {
    const container = el('div', 'chat-window-wrapper n8n-chat', { id: this.opts.containerId || 'n8n-chat' });
    const windowEl = el('div', 'chat-window');
    const main = el('div', 'chat-layout chat-wrapper');

    // Header
    const header = el('div', 'chat-header');
    const heading = el('div', 'chat-heading');
    const h1 = el('h1');
    h1.textContent = this.config.title || 'Chat';
    const subtitle = el('p');
    subtitle.textContent = this.config.subtitle || '';
    const reset = el('button', 'chat-reset-button', { type: 'button', 'aria-label': 'New chat' });
    const resetLabel = el('span', 'label');
    resetLabel.textContent = 'New chat';
    reset.appendChild(resetLabel);
    heading.appendChild(h1);
    header.appendChild(heading);
    header.appendChild(subtitle);
    header.appendChild(reset);

    // Body + messages
    const body = el('div', 'chat-body');
    const list = el('div', 'chat-messages-list');
    body.appendChild(list);

    // Footer / input
    const footer = el('div', 'chat-footer');
    const inputWrap = el('div', 'chat-input');
    const inputs = el('div', 'chat-inputs');
    const textarea = el('textarea', undefined, { 'data-test-id': 'chat-input', placeholder: this.config.placeholder || 'Type your message' });
    textarea.style.height = '54px';
    const controls = el('div', 'chat-inputs-controls');
    const sendBtn = el('button', 'chat-input-send-button', { 'aria-label': 'Send' }) as HTMLButtonElement;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="m2 21l21-9L2 3v7l15 2l-15 2z"></path></svg>';
    controls.appendChild(sendBtn);
    inputs.appendChild(textarea);
    inputs.appendChild(controls);
    inputWrap.appendChild(inputs);
    footer.appendChild(inputWrap);

    // Assemble
    main.appendChild(header);
    main.appendChild(body);
    main.appendChild(footer);
    windowEl.appendChild(main);
    container.appendChild(windowEl);

    // Toggle docked button
    const toggle = el('div', 'chat-window-toggle', { 'aria-label': this.config.toggleAriaLabel || 'Toggle chat' });
    // Customizable toggle icon (supports emoji/text or HTML/SVG string)
    if (this.config.toggleIcon) {
      toggle.innerHTML = this.config.toggleIcon;
    } else {
      toggle.innerHTML = '<svg viewBox="0 0 24 24" width="32" height="32" class=""><path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6l-6-6z"></path></svg>';
    }
    container.appendChild(toggle);

    parent.appendChild(container);

    // Save refs
    this.root = container;
    this.bodyEl = body;
    this.listEl = list;
    this.textarea = textarea as HTMLTextAreaElement;
    this.sendBtn = sendBtn;
    this.toggleBtn = toggle as HTMLDivElement;
    this.resetBtn = reset as HTMLButtonElement;

    // Events
    const updateSendState = () => {
      const val = this.textarea.value.trim();
      this.sendBtn.disabled = val.length === 0;
    };

    this.textarea.addEventListener('input', updateSendState);
    this.textarea.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!this.sendBtn.disabled) this.onSend();
      }
    });
    this.sendBtn.addEventListener('click', () => this.onSend());

    this.toggleBtn.addEventListener('click', () => {
      const willOpen = !this.root.classList.contains('open');
      this.root.classList.toggle('open');
      if (willOpen) {
        // Defer to next frame so layout is applied before scrolling
        requestAnimationFrame(() => this.scrollToBottom(true));
      }
    });

    this.resetBtn.addEventListener('click', () => this.resetChat());

    // Initial state
    if (this.config.startOpen) this.root.classList.add('open');

    // Render existing history
    this.renderMessages(this.store.getMessages());
    // Ensure initial view is scrolled to the bottom (history visible)
    this.scrollToBottom(false);
  }

  private scrollToBottom(smooth: boolean = true) {
    if (!this.bodyEl) return;
    try {
      const behavior = smooth ? 'smooth' : 'auto';
      this.bodyEl.scrollTo({ top: this.bodyEl.scrollHeight, behavior: behavior as ScrollBehavior });
    } catch {
      // Fallback
      this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
    }
  }

  private appendMessage(msg: ChatMessage) {
    const item = el('div', `chat-message chat-message-from-${msg.role}`);
    const actions = el('div', 'chat-message-actions');
    const md = el('div', 'chat-message-markdown');
    const html = this.config.renderMarkdown ? this.config.renderMarkdown(msg.content) : renderMarkdown(msg.content);
    md.innerHTML = html;
    item.appendChild(actions);
    item.appendChild(md);
    this.listEl.appendChild(item);
    // Scroll to bottom
    this.scrollToBottom(true);
  }

  private showTyping() {
    if (this.typingEl) return;
    const item = el('div', 'chat-message chat-message-from-bot typing');
    const actions = el('div', 'chat-message-actions');
    const md = el('div', 'chat-message-markdown');
    md.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    item.appendChild(actions);
    item.appendChild(md);
    this.listEl.appendChild(item);
    this.typingEl = item;
    this.scrollToBottom(true);
  }

  private hideTyping() {
    if (this.typingEl && this.typingEl.parentElement === this.listEl) {
      this.listEl.removeChild(this.typingEl);
    }
    this.typingEl = null;
  }

  private appendError(text: string, onRetry?: () => void) {
    const wrap = el('div', 'chat-error');
    const msg = el('div', 'chat-error-text');
    msg.textContent = text;
    wrap.appendChild(msg);
    if (onRetry) {
      const actions = el('div', 'chat-error-actions');
      const retryBtn = el('button', 'chat-error-retry', { type: 'button', 'aria-label': 'Retry request' }) as HTMLButtonElement;
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', () => {
        // Remove banner and invoke retry
        if (wrap.parentElement === this.listEl) this.listEl.removeChild(wrap);
        onRetry();
      });
      actions.appendChild(retryBtn);
      wrap.appendChild(actions);
    }
    this.listEl.appendChild(wrap);
    this.scrollToBottom(true);
  }

  private renderMessages(messages: ChatMessage[]) {
    this.listEl.innerHTML = '';
    for (const m of messages) this.appendMessage(m);
    // appendMessage already scrolls, but ensure a final scroll pass (non-smooth to avoid long animations on big histories)
    this.scrollToBottom(false);
  }

  private async onSend() {
    const text = this.textarea.value.trim();
    if (!text) return;
    this.textarea.value = '';
    this.sendBtn.disabled = true;

    const messages = this.store.getMessages();
    const userMsg: ChatMessage = { id: `${Date.now()}-u`, role: 'user', content: text, createdAt: Date.now() };
    messages.push(userMsg);
    this.store.saveMessages(messages);
    this.appendMessage(userMsg);

    await this.attemptBotResponse(text);
  }

  private async attemptBotResponse(text: string): Promise<void> {
    try {
      this.showTyping();
      const botMsg = await this.client.sendMessage(text, this.store.getSessionId(), this.store.getMessages(), this.config);
      this.hideTyping();
      const messages = this.store.getMessages();
      messages.push(botMsg);
      this.store.saveMessages(messages);
      this.appendMessage(botMsg);
      // Re-enable send button depending on textarea content
      this.sendBtn.disabled = (this.textarea.value.trim().length === 0);
    } catch (err) {
      // Hide typing indicator and show a friendly error banner with retry
      this.hideTyping();
      // eslint-disable-next-line no-console
      console.error('[chat] request failed', err);
      this.appendError('There was a problem contacting the assistant. Please try again.', () => {
        // Retry the same prompt without duplicating the user message
        void this.attemptBotResponse(text);
      });
      // Allow user to edit/resend
      this.sendBtn.disabled = (this.textarea.value.trim().length === 0);
    }
  }

  private resetChat() {
    this.store.clear();
    this.renderMessages([]);
    this.scrollToBottom(false);
  }
}
