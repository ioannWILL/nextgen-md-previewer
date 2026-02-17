import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { listener, listenerCtx } from '@milkdown/plugin-listener';

declare global {
  interface Window {
    initialContent: string;
    vscodeApi: {
      postMessage: (message: unknown) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };
  }
}

class WYSIWYGEditor {
  private editor: Editor | null = null;
  private isExternalUpdate = false;

  async initialize(): Promise<void> {
    const container = document.getElementById('editor');
    if (!container) {
      console.error('Editor container not found');
      return;
    }

    // Unescape the initial content
    const initialContent = this.unescapeContent(window.initialContent);

    // Create the Milkdown editor
    this.editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, container);
        ctx.set(defaultValueCtx, initialContent);

        // Set up listener for content changes
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
          if (!this.isExternalUpdate) {
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
      const message = event.data;
      this.handleMessage(message);
    });
  }

  private unescapeContent(content: string): string {
    return content
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  private handleMessage(message: { type: string; content?: string }): void {
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

    this.isExternalUpdate = true;

    // TODO: Implement proper content update using Milkdown's API
    // For now, this is a placeholder that will be enhanced in Phase 2
    console.log('External content update received');

    this.isExternalUpdate = false;
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
