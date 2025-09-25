import { ChatConfig } from './types';
import { LocalStorageChatStore } from './storage';
import { N8nHttpClient } from './client';
import { ChatUI } from './ui';

export interface DocsifyChatConfig extends ChatConfig {
  cssUrl?: string; // optional URL to CSS to inject
  containerId?: string; // override default container id
}

function ensureCss(cssUrl?: string) {
  if (!cssUrl) return;
  const existing = document.querySelector(`link[data-n8n-chat-css="${cssUrl}"]`);
  if (existing) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssUrl;
  link.setAttribute('data-n8n-chat-css', cssUrl);
  document.head.appendChild(link);
}

export function docsifyN8nChatPlugin(config: DocsifyChatConfig) {
  return function (hook: any, vm: any) {
    hook.ready(function () {
      try {
        ensureCss(config.cssUrl);
        const store = new LocalStorageChatStore(config.storageKey || 'docsify-n8n-chat');
        const client = new N8nHttpClient();
        const ui = new ChatUI(store, client, config, { containerId: config.containerId || 'n8n-chat' });
        ui.mount(document.body);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[docsify-n8n-chat] failed to mount:', e);
      }
    });
  };
}
