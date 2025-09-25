export type ChatRole = 'user' | 'bot';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  meta?: Record<string, unknown>;
}

export interface ChatConfig {
  // n8n webhook endpoint (POST)
  endpoint: string;
  // Optional static headers (e.g., api key)
  headers?: Record<string, string>;
  // Session persistence key prefix
  storageKey?: string;
  // UI text
  title?: string;
  subtitle?: string;
  placeholder?: string;
  // UI behavior
  startOpen?: boolean;
  toggleAriaLabel?: string;
  // Customize the launcher/toggle icon. If provided, will be injected into the toggle element.
  // This can be plain text (emoji ok) or an HTML string (e.g., an <svg> snippet).
  toggleIcon?: string;
  // Optional metadata to include with each request (static or computed per send)
  metadata?: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>);
  // Optional pluggable markdown renderer. If not provided, a safe default renderer is used
  // that escapes HTML and converts newlines to <br/>.
  renderMarkdown?: (text: string) => string;
  // Optional function to transform outgoing payloads
  transformPayload?: (input: { message: string; sessionId: string; history: ChatMessage[]; metadata?: Record<string, unknown> }) => unknown;
  // Optional function to transform incoming n8n response to bot message content
  transformResponse?: (response: unknown) => string;
  // History behavior
  // If false, no history is sent to the backend. If true (default), history is sent.
  // Additionally, you can limit the number of most recent messages by setting historyWindow.
  sendHistory?: boolean;
  // When set, only the last N messages are sent as history. Ignored if sendHistory is false.
  historyWindow?: number;
}

export interface ChatStore {
  getSessionId(): string;
  getMessages(): ChatMessage[];
  saveMessages(messages: ChatMessage[]): void;
  clear(): void;
}

export interface ChatClient {
  sendMessage(message: string, sessionId: string, history: ChatMessage[], config: ChatConfig): Promise<ChatMessage>;
}
