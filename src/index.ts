import { docsifyN8nChatPlugin } from './plugin';
import { LocalStorageChatStore } from './storage';
import { N8nHttpClient } from './client';
import { ChatUI } from './ui';
export { docsifyN8nChatPlugin, type DocsifyChatConfig } from './plugin';
export { LocalStorageChatStore } from './storage';
export { N8nHttpClient } from './client';
export { ChatUI } from './ui';
export type { ChatConfig, ChatMessage, ChatStore, ChatClient } from './types';

// Helper to register with Docsify via script tag usage
export function registerDocsifyPlugin(config: import('./plugin').DocsifyChatConfig) {
  // @ts-ignore
  const w = (typeof window !== 'undefined' ? window : undefined) as any;
  if (!w) return;
  w.$docsify = w.$docsify || {};
  const plugin = requirePlugin(config);
  w.$docsify.plugins = (w.$docsify.plugins || []).concat([plugin]);
}

function requirePlugin(config: import('./plugin').DocsifyChatConfig) {
  return docsifyN8nChatPlugin(config);
}

// Default export for UMD consumers
export default {
  docsifyN8nChatPlugin,
  registerDocsifyPlugin,
  LocalStorageChatStore,
  N8nHttpClient,
  ChatUI,
};

// Auto-register when loaded via <script type="module"> on a Docsify page
(() => {
  if (typeof window === 'undefined') return;
  const w = window as any;
  try {
    if (w.$docsify && w.$docsify.n8nChat && !w.__n8nChatAdapterRegistered) {
      // Prevent double registration
      w.__n8nChatAdapterRegistered = true;
      registerDocsifyPlugin(w.$docsify.n8nChat);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[docsify-n8n-chat] auto-register failed:', e);
  }
})();
