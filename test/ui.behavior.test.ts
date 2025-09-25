import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatUI } from '../src/ui';
import { LocalStorageChatStore } from '../src/storage';
import type { ChatConfig, ChatMessage, ChatClient } from '../src/types';

class DelayedClient implements ChatClient {
  constructor(private readonly delayMs: number, private readonly shouldFail = false) {}
  async sendMessage(message: string, sessionId: string, history: ChatMessage[], config: ChatConfig): Promise<ChatMessage> {
    await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.shouldFail) throw new Error('network boom');
    return { id: 'b1', role: 'bot', content: `ok:${message}`, createdAt: Date.now() };
  }
}

describe('ChatUI behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Mock localStorage
    let backing: Record<string, string> = {};
    // @ts-ignore
    globalThis.localStorage = {
      getItem: vi.fn((k: string) => backing[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { backing[k] = String(v); }),
      removeItem: vi.fn((k: string) => { delete backing[k]; }),
      clear: vi.fn(() => { backing = {}; }),
      key: vi.fn(),
      length: 0,
    } as any;
  });

  it('shows typing indicator while awaiting response', async () => {
    const store = new LocalStorageChatStore('t');
    const client = new DelayedClient(25);
    const config: ChatConfig = { endpoint: '/x' };
    const ui = new ChatUI(store, client, config);
    ui.mount(document.body);

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const sendBtn = document.querySelector('.chat-input-send-button') as HTMLButtonElement;
    textarea.value = 'hello';
    textarea.dispatchEvent(new Event('input'));

    // Send
    sendBtn.click();

    // Allow event loop to schedule async call
    await new Promise((r) => setTimeout(r, 0));

    // Typing indicator should appear
    const typing = document.querySelector('.chat-message.typing');
    expect(typing).toBeTruthy();

    // Wait for response to finish
    await new Promise((r) => setTimeout(r, 35));

    // Typing indicator should be gone and bot message present
    expect(document.querySelector('.chat-message.typing')).toBeFalsy();
    const msgs = document.querySelectorAll('.chat-message');
    expect(msgs.length).toBe(2);
  });

  it('shows friendly error and hides typing on failure', async () => {
    const store = new LocalStorageChatStore('t');
    const client = new DelayedClient(10, true);
    const config: ChatConfig = { endpoint: '/x' };
    const ui = new ChatUI(store, client, config);
    ui.mount(document.body);

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const sendBtn = document.querySelector('.chat-input-send-button') as HTMLButtonElement;
    textarea.value = 'boom';
    textarea.dispatchEvent(new Event('input'));
    sendBtn.click();

    await new Promise((r) => setTimeout(r, 25));

    // No typing left
    expect(document.querySelector('.chat-message.typing')).toBeFalsy();
    // Error banner shown
    const err = document.querySelector('.chat-error') as HTMLElement;
    expect(err).toBeTruthy();
    expect(err.textContent || '').toMatch(/There was a problem/);
  });
});
