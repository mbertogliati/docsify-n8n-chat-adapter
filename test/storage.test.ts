import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageChatStore } from '../src/storage';

function mockLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = String(v);
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _dump: () => store,
  } as unknown as Storage;
}

describe('LocalStorageChatStore', () => {
  let original: Storage | undefined;
  beforeEach(() => {
    // @ts-ignore
    original = globalThis.localStorage;
    // @ts-ignore
    globalThis.localStorage = mockLocalStorage();
  });

  it('generates and persists session id', () => {
    const s = new LocalStorageChatStore('t');
    const id1 = s.getSessionId();
    const id2 = s.getSessionId();
    expect(id1).toBeTruthy();
    expect(id1).toEqual(id2);
  });

  it('saves and reads messages', () => {
    const s = new LocalStorageChatStore('t');
    expect(s.getMessages()).toEqual([]);
    s.saveMessages([
      { id: '1', role: 'user', content: 'hi', createdAt: Date.now() },
    ]);
    const list = s.getMessages();
    expect(list.length).toBe(1);
    expect(list[0].content).toBe('hi');
  });

  it('clears messages', () => {
    const s = new LocalStorageChatStore('t');
    s.saveMessages([{ id: '1', role: 'user', content: 'hi', createdAt: Date.now() }]);
    s.clear();
    expect(s.getMessages()).toEqual([]);
  });
});
