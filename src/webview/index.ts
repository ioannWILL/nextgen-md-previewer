import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { history } from '@milkdown/plugin-history';
import { prism } from '@milkdown/plugin-prism';
import { math } from '@milkdown/plugin-math';
import { replaceAll } from '@milkdown/utils';

// Import KaTeX CSS as text (will inject when DOM is ready)
import katexCSS from 'katex/dist/katex.min.css';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../shared/types';
import { Toolbar } from './toolbar';

declare global {
  interface Window {
    initialContent: string;
    toolbarVisible: boolean;
    imageBaseUri: string;
    vscodeApi: {
      postMessage: (message: WebviewToExtensionMessage) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };
  }
}

class WYSIWYGEditor {
  private editor: Editor | null = null;
  private toolbar: Toolbar | null = null;
  private isExternalUpdate = false;
  private lastKnownContent = '';

  async initialize(): Promise<void> {
    const container = document.getElementById('editor');
    if (!container) {
      return;
    }

    // Inject KaTeX CSS
    const katexStyle = document.createElement('style');
    katexStyle.textContent = katexCSS;
    document.head.appendChild(katexStyle);


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
      .use(history)
      .use(prism)
      .use(math)
      .use(listener)
      .create();

    // Initialize toolbar if visible
    const toolbarVisible = window.toolbarVisible !== false;
    if (toolbarVisible) {
      this.toolbar = new Toolbar(this.editor);
    }

    // Set up image path transformation
    this.setupImagePathTransformation(container);

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

  private setupImagePathTransformation(container: HTMLElement): void {
    const baseUri = window.imageBaseUri;
    if (!baseUri) return;

    // Transform a single image element
    const transformImage = (img: HTMLImageElement) => {
      const src = img.getAttribute('src');
      if (!src) return;

      // Skip already transformed URLs (webview URIs, data URIs, absolute URLs)
      if (src.startsWith('vscode-webview://') ||
          src.startsWith('data:') ||
          src.startsWith('http://') ||
          src.startsWith('https://')) {
        return;
      }

      // Transform relative path to webview URI
      // Remove leading ./ if present
      const cleanPath = src.startsWith('./') ? src.slice(2) : src;
      const newSrc = `${baseUri}/${cleanPath}`;
      img.setAttribute('src', newSrc);
    };

    // Transform existing images
    container.querySelectorAll('img').forEach(img => transformImage(img as HTMLImageElement));

    // Watch for new images with MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check added nodes for images
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) {
            transformImage(node);
          } else if (node instanceof HTMLElement) {
            node.querySelectorAll('img').forEach(img => transformImage(img as HTMLImageElement));
          }
        });

        // Check attribute changes on images
        if (mutation.type === 'attributes' &&
            mutation.attributeName === 'src' &&
            mutation.target instanceof HTMLImageElement) {
          transformImage(mutation.target);
        }
      });
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  }

}

// Initialize editor when DOM is ready
const editor = new WYSIWYGEditor();
editor.initialize().catch(console.error);
