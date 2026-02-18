import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../shared/types';

declare global {
  interface Window {
    initialContent: string;
    vscodeApi: {
      postMessage: (message: WebviewToExtensionMessage) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };
  }
}

class WYSIWYGEditor {
  private editor: Editor | null = null;
  private isExternalUpdate = false;
  private lastKnownContent = '';

  async initialize(): Promise<void> {
    const container = document.getElementById('editor');
    if (!container) {
      return;
    }

    // JSON.stringify on the extension side means initialContent is already properly parsed
    const initialContent = window.initialContent;
    this.lastKnownContent = initialContent;

    // Create the Milkdown editor
    this.editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, container);
        ctx.set(defaultValueCtx, initialContent);

        // Set up listener for content changes
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          if (!this.isExternalUpdate) {
            this.lastKnownContent = markdown;
            this.onContentChanged(markdown);
          }
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .create();

    // Notify extension that editor is ready
    window.vscodeApi.postMessage({ type: 'ready' });

    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data as ExtensionToWebviewMessage;
      this.handleMessage(message);
    });
  }

  private handleMessage(message: ExtensionToWebviewMessage): void {
    switch (message.type) {
      case 'contentUpdate':
        if (message.content !== undefined) {
          this.updateContent(message.content);
        }
        break;
    }
  }

  private updateContent(markdown: string): void {
    if (!this.editor) return;

    // Skip if content hasn't actually changed
    if (markdown === this.lastKnownContent) return;

    this.isExternalUpdate = true;
    this.lastKnownContent = markdown;

    try {
      // Use Milkdown's replaceAll action to update editor content
      this.editor.action(replaceAll(markdown));
    } finally {
      this.isExternalUpdate = false;
    }
  }

  private onContentChanged(markdown: string): void {
    window.vscodeApi.postMessage({
      type: 'contentChanged',
      content: markdown,
    });
  }
}

// Initialize editor when DOM is ready
const editor = new WYSIWYGEditor();
editor.initialize().catch(console.error);
