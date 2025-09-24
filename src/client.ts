import { ChatClient, ChatConfig, ChatMessage } from './types';

export class N8nHttpClient implements ChatClient {
  async sendMessage(message: string, sessionId: string, history: ChatMessage[], config: ChatConfig): Promise<ChatMessage> {
    const payload = config.transformPayload
      ? config.transformPayload({ message, sessionId, history })
      : {
          message,
          sessionId,
          history,
        };

    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`n8n chat request failed: ${res.status} ${res.statusText} ${text}`);
    }

    let data: unknown = undefined;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }

    const content = config.transformResponse ? config.transformResponse(data) : defaultTransformResponse(data);

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: 'bot',
      content,
      createdAt: Date.now(),
    };
  }
}

function defaultTransformResponse(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    // Attempt common shapes used by n8n webhook nodes
    const d = data as Record<string, any>;
    if (typeof d.text === 'string') return d.text;
    if (typeof d.message === 'string') return d.message;
    if (Array.isArray(d.messages)) return d.messages.map((m: any) => (typeof m === 'string' ? m : JSON.stringify(m))).join('\n');
    return JSON.stringify(d);
  }
  return String(data);
}
