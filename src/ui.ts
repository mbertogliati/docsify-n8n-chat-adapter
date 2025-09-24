import { ChatConfig, ChatMessage, ChatStore, ChatClient } from './types';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function renderMarkdown(text: string): string {
  // Minimal escape; leave advanced markdown to host css or later enhancement
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br/>');
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

  constructor(
    private readonly store: ChatStore,
    private readonly client: ChatClient,
    private readonly config: ChatConfig,
    private readonly opts: ChatUIOptions = {}
  ) {}

  mount(parent: HTMLElement = document.body) {
    const container = el('div', 'chat-window-wrapper n8n-chat', { id: this.opts.containerId || 'n8n-chat' });
    const windowEl = el('div', 'chat-window');
    const main = el('main', 'chat-layout chat-wrapper');

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
    toggle.innerHTML = '<svg viewBox="0 0 24 24" width="32" height="32" class=""><path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6l-6-6z"></path></svg>';
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
      this.root.classList.toggle('open');
    });

    this.resetBtn.addEventListener('click', () => this.resetChat());

    // Initial state
    if (this.config.startOpen) this.root.classList.add('open');

    // Render existing history
    this.renderMessages(this.store.getMessages());
  }

  private appendMessage(msg: ChatMessage) {
    const item = el('div', `chat-message chat-message-from-${msg.role}`);
    const actions = el('div', 'chat-message-actions');
    const md = el('div', 'chat-message-markdown');
    md.innerHTML = renderMarkdown(msg.content);
    item.appendChild(actions);
    item.appendChild(md);
    this.listEl.appendChild(item);
    // Scroll to bottom
    this.listEl.scrollTop = this.listEl.scrollHeight;
  }

  private renderMessages(messages: ChatMessage[]) {
    this.listEl.innerHTML = '';
    for (const m of messages) this.appendMessage(m);
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

    try {
      const botMsg = await this.client.sendMessage(text, this.store.getSessionId(), messages, this.config);
      messages.push(botMsg);
      this.store.saveMessages(messages);
      this.appendMessage(botMsg);
    } catch (err) {
      const errorText = err instanceof Error ? err.message : String(err);
      const botMsg: ChatMessage = { id: `${Date.now()}-e`, role: 'bot', content: `Error: ${errorText}`, createdAt: Date.now() };
      messages.push(botMsg);
      this.store.saveMessages(messages);
      this.appendMessage(botMsg);
    }
  }

  private resetChat() {
    this.store.clear();
    this.renderMessages([]);
  }
}
