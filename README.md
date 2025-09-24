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
<!-- Optional: include default styles from this package -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/src/n8n-chat-adapter.css">
```

UMD build (if you need it):

```html
<script src="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/dist/index.umd.min.js"></script>
```

## Usage with Docsify

Add config to your `index.html` before Docsify loads:

```html
<script>
  window.$docsify = {
    // n8n Chat widget configuration (used by @n8n/chat adapter below)
    // Set webhookUrl to your n8n Webhook URL (POST) that handles chat messages
    n8nChat: {
      webhookUrl: 'http://localhost:8787/chat',
      position: 'right', // 'left' | 'right'
      iconUrl: '', // optional custom icon PNG for the launcher
      defaultOpen: false, // open widget by default
      keepHistory: true, // maps to loadPreviousSession
      storageKey: 'n8nchat', // namespace for localStorage keys
      welcome: 'How can I help you today?',
      // Advanced @n8n/chat options
      webhookConfig: { method: 'POST', headers: {} },
      chatInputKey: 'chatInput',
      chatSessionKey: 'sessionId',
      defaultLanguage: 'es',
      i18n: {
        es:{
          title: 'Asistente',
          subtitle: 'Haz tus preguntas sobre esta documentación',
          sendLabel: 'Enviar',
          resetLabel: 'Reiniciar',
          closeLabel: 'Cerrar',
          inputPlaceholder: 'Escribe tu consulta aquí...',
        },
        en:{
          title: 'Assistant',
          subtitle: 'Ask questions about this documentation',
          sendLabel: 'Send',
          resetLabel: 'Reset',
          closeLabel: 'Close',
          inputPlaceholder: 'Type your question here...',
        }
      },
      initialMessages: undefined,
      enableStreaming: false,
      // Any extra fields here will be forwarded to n8n in the payload
      extraPayload: {}
    }
  };
</script>

<!-- Load Docsify core -->
<script src="//cdn.jsdelivr.net/npm/docsify@4"></script>
<!-- Load the adapter (ESM or UMD) -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@mbertogliati/docsify-n8n-chat-adapter/dist/index.esm.js"></script>
```

If using npm bundlers, import the plugin entry:

```js
import '@mbertogliati/docsify-n8n-chat-adapter';
// or
import { initDocsifyN8nChat, docsifyN8nChatPlugin } from '@mbertogliati/docsify-n8n-chat-adapter';
// and include CSS from the package in your bundler or HTML
// e.g., Vite/Webpack style import:
// import '@mbertogliati/docsify-n8n-chat-adapter/src/n8n-chat-adapter.css';
```

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
