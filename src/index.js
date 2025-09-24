// Entry for the package: registers a Docsify plugin and re-exports the initializer
import { initDocsifyN8nChat } from './n8n-chat-adapter.js';

export { initDocsifyN8nChat };

export function docsifyN8nChatPlugin(hook, vm) {
  // Ensure the widget is initialized when Docsify is ready
  hook.ready(() => {
    try {
      const res = initDocsifyN8nChat();
      // init is async now; ignore returned promise
      if (res && typeof res.catch === 'function') {
        res.catch((e) => console.error('[docsify-n8n-chat-adapter] init failed', e));
      }
    } catch (e) {
      console.error('[docsify-n8n-chat-adapter] init error', e);
    }
  });
}

// Auto-register plugin if running in the browser
if (typeof window !== 'undefined') {
  window.$docsify = window.$docsify || {};
  const plugins = window.$docsify.plugins || [];
  plugins.push(docsifyN8nChatPlugin);
  window.$docsify.plugins = plugins;
}

export default { initDocsifyN8nChat, docsifyN8nChatPlugin };
