import { ChatMessage, ChatStore } from './types';

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    // @ts-ignore
    const rnds = crypto.getRandomValues(new Uint8Array(16));
    // Per RFC 4122 4.4
    rnds[6] = (rnds[6] & 0x0f) | 0x40; // version 4
    rnds[8] = (rnds[8] & 0x3f) | 0x80; // variant
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const hex = Array.from(rnds).map(toHex).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Fallback non-crypto
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class LocalStorageChatStore implements ChatStore {
  private readonly key: string;
  private readonly sessionKey: string;

  constructor(keyPrefix = 'docsify-n8n-chat') {
    this.key = `${keyPrefix}:messages`;
    this.sessionKey = `${keyPrefix}:sessionId`;
  }

  getSessionId(): string {
    try {
      const existing = localStorage.getItem(this.sessionKey);
      if (existing) return existing;
      const id = uuidv4();
      localStorage.setItem(this.sessionKey, id);
      return id;
    } catch {
      // No storage available, return volatile id
      return uuidv4();
    }
  }

  getMessages(): ChatMessage[] {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  }

  saveMessages(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // ignore
    }
  }
}
