import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatUI } from '../src/ui';
import { LocalStorageChatStore } from '../src/storage';
import { N8nHttpClient } from '../src/client';
import type { ChatConfig, ChatMessage } from '../src/types';

class MockClient extends N8nHttpClient {
  async sendMessage(message: string, sessionId: string, history: ChatMessage[], config: ChatConfig): Promise<ChatMessage> {
    const msg: ChatMessage = { id: 'bot-1', role: 'bot', content: `echo:${message}`, createdAt: Date.now() };
    return msg;
  }
}

describe('ChatUI', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Mock localStorage for store
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

  it('mounts and renders header and controls', () => {
    const store = new LocalStorageChatStore('t');
    const client = new MockClient();
    const config: ChatConfig = {
      endpoint: '/x',
      title: 'App Lookup 🔍',
      subtitle: 'Busca aquí a qué aplicación/team pertenece un recurso',
      placeholder: 'Escribe tu consulta aquí',
      startOpen: true,
    };

    const ui = new ChatUI(store, client, config);
    ui.mount(document.body);

    const root = document.querySelector('#n8n-chat') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.classList.contains('open')).toBe(true);

    expect(root.querySelector('.chat-header h1')?.textContent).toBe('Fury App Lookup 🔍');
    expect(root.querySelector('.chat-header p')?.textContent).toContain('Busca aquí');

    const textarea = root.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe('Escribe tu consulta aquí');

    const toggle = root.querySelector('.chat-window-toggle');
    expect(toggle).toBeTruthy();
  });

  it('sends a message and appends bot echo', async () => {
    const store = new LocalStorageChatStore('t');
    const client = new MockClient();
    const config: ChatConfig = { endpoint: '/x' };

    const ui = new ChatUI(store, client, config);
    ui.mount(document.body);

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const sendBtn = document.querySelector('.chat-input-send-button') as HTMLButtonElement;
    textarea.value = 'hola';
    textarea.dispatchEvent(new Event('input'));
    expect(sendBtn.disabled).toBe(false);

    // Click send
    sendBtn.click();

    // wait a tick
    await new Promise((r) => setTimeout(r, 0));

    const messages = document.querySelectorAll('.chat-message');
    expect(messages.length).toBe(2);
    expect(messages[0].querySelector('.chat-message-markdown')?.textContent).toContain('hola');
    expect(messages[1].querySelector('.chat-message-markdown')?.innerHTML).toContain('echo:hola');
  });
});
