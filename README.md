# @mbertogliati/docsify-n8n-chat-adapter

Docsify plugin that embeds the `@n8n/chat` web widget into your Docsify site, with
workarounds for known session and UI persistence issues.

- Keeps a stable session id in localStorage and forwards it via `metadata.sessionId`.
- Optionally persists chat transcript locally and restores it on reload.
- Supports custom launcher icon, left/right position, i18n labels, and more.

## Installation

Install from npm:

```bash
npm i @mbertogliati/docsify-n8n-chat-adapter
```

Or load from jsDelivr CDN:

```html
<!-- ESM build (auto-registers the plugin globally) -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/dist/index.esm.js"></script>
<!-- Styles: choose one -->
<!-- If you are using Docsify Themeable -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/src/docsify-themable.css">
<!-- Otherwise (vanilla pages) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/src/chat-basic.css">
```

UMD build (if you need it):

```html
<script src="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/dist/index.umd.min.js"></script>
```

## Usage with Docsify

Add this to your `index.html`. Script order is important: config → CSS → adapter (ESM) → Docsify.

```html
<!-- 1) Docsify config BEFORE loading scripts -->
<script>
  window.$docsify = {
    name: 'My Docs',
    n8nChat: {
      endpoint: 'http://localhost:8787/chat',
      title: 'Assistant',
      subtitle: 'Ask anything about this documentation',
      placeholder: 'Type your question here…',
      startOpen: false,
      // Optional:
      headers: {},
      sendHistory: true,
      historyWindow: 20,
      toggleIcon: '💬',
      // containerId: 'n8n-chat'
    }
  };
  // The adapter will auto-register the plugin using window.$docsify.n8nChat
  // when it loads (see src/index.ts).
  // Ensure you load the adapter BEFORE Docsify.
  
</script>

<!-- 2) Recommended CSS for Docsify Themeable sites -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/src/docsify-themable.css">

<!-- 3) Load the adapter BEFORE Docsify (ESM) -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/dist/index.esm.js"></script>

<!-- 4) Load Docsify core -->
<script src="//cdn.jsdelivr.net/npm/docsify@4"></script>
```

If using npm bundlers, import the plugin entry:

```js
import '@mbertogliati/docsify-n8n-chat-adapter';
// or
import { initDocsifyN8nChat, docsifyN8nChatPlugin } from '@mbertogliati/docsify-n8n-chat-adapter';
// and include CSS from the package in your bundler or HTML
// e.g., Vite/Webpack style import:
// import '@mbertogliati/docsify-n8n-chat-adapter/src/docsify-themable.css';
```

## Usage without Docsify (vanilla)

You can mount the chat UI anywhere on your site. Create a store, a client, then a `ChatUI` and call `mount()`.

```ts
import { LocalStorageChatStore, N8nHttpClient, ChatUI, type ChatConfig } from '@mbertogliati/docsify-n8n-chat-adapter';

// 1) Configure the chat
const config: ChatConfig = {
  endpoint: 'https://your-n8n-instance/webhook/chat',
  title: 'Assistant',
  subtitle: 'Ask anything about this site',
  placeholder: 'Type your question…',
  startOpen: false,
  // Optional headers for your webhook
  headers: { 'x-api-key': '…' },
  // Optional: limit or disable history sending
  sendHistory: true,
  historyWindow: 20,
  // Optional: add custom metadata
  metadata: () => ({ appVersion: '1.0.0' }),
  // Optional: customize the launcher icon (emoji, text, or SVG/HTML)
  toggleIcon: '💬',
};

// 2) Provide storage and a client implementation
const store = new LocalStorageChatStore(config.storageKey || 'n8nchat');
const client = new N8nHttpClient();

// 3) Create and mount the UI
const ui = new ChatUI(store, client, config, { containerId: 'n8n-chat' });
ui.mount(document.body);
```

Include one of the provided styles (recommended):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/src/chat-basic.css">
<!-- If your site uses Docsify Themeable, prefer this stylesheet instead: -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/src/docsify-themable.css">
<!-- If you include both, make sure docsify-themable.css comes AFTER chat-basic.css so it replaces those styles. -->
```

You can also add custom CSS to fit your brand.

## Configuration (ChatConfig)

```ts
interface ChatConfig {
  endpoint: string;                    // Your n8n webhook URL (POST)
  headers?: Record<string, string>;    // Optional HTTP headers
  storageKey?: string;                 // Namespace for localStorage keys
  title?: string;                      // Header title
  subtitle?: string;                   // Header subtitle
  placeholder?: string;                // Input placeholder
  startOpen?: boolean;                 // Open chat window at start
  toggleAriaLabel?: string;            // Accessibility label for launcher
  toggleIcon?: string;                 // Custom launcher icon (emoji, text, HTML/SVG string)
  metadata?: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>);
  renderMarkdown?: (text: string) => string; // Custom markdown renderer
  transformPayload?: (input: { message: string; sessionId: string; history: ChatMessage[]; metadata?: Record<string, unknown> }) => unknown;
  transformResponse?: (response: unknown) => string; // Map your webhook response to display text
  sendHistory?: boolean;               // If false, no history is sent (default true)
  historyWindow?: number;              // Send only the last N messages
}
```

Notes:

- __Session id__: stored in localStorage via `LocalStorageChatStore` and passed to the client; also available to your webhook via metadata if you add it there.
- __History__: local transcript is kept by the store; what is sent to n8n can be disabled or windowed via `sendHistory` and `historyWindow`.
- __Payload/Response__: use `transformPayload` and `transformResponse` to adapt to your n8n webhook contract.

## Styling and theming

- __Basic theme__: `src/chat-basic.css` provides neutral styling (vanilla pages).
- __Docsify Themeable__: `src/docsify-themable.css` integrates with Docsify Themeable variables and layout.
- You can override classes such as `.chat-window-toggle`, `.chat-message-from-user`, `.chat-message-from-bot`, `.chat-input-send-button` to customize colors and spacing.
- Message and window animations are included; feel free to adjust keyframes in the CSS files.

## Limitations

- No streaming: responses are not streamed; the bot message appears once the request completes.
- No SSE/WebSocket: uses a single HTTP POST per message; server-sent events are not supported.
- Sanitized markdown by default: HTML is sanitized; provide a custom `renderMarkdown` if you need different behavior.
- Local-only transcript persistence: clearing browser storage removes local history unless your backend reconstructs it.

## Known issues

- n8n receiver must include `metadata.sessionId` in the body (workaround for @n8n/chat session bug).
- Cached transcript rehydration uses rendered HTML; messages may appear as AI messages on reload.
- The chat can auto-close in certain flows (upstream behavior).

## Development

- Source: `src/`
- Build: `dist/` via Rollup

Scripts:

```bash
npm run build
```

## License

MIT
