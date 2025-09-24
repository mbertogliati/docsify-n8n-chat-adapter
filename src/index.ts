import { docsifyN8nChatPlugin } from './plugin';
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
