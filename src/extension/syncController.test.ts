import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock VS Code module - must be defined before imports
vi.mock('vscode', () => {
  const mockDisposable = { dispose: vi.fn() };

  return {
    workspace: {
      getConfiguration: vi.fn().mockReturnValue({
        get: vi.fn().mockImplementation((key: string, defaultValue: unknown) => {
          if (key === 'autoSaveDelay') return 100;
          return defaultValue;
        }),
      }),
      onDidChangeTextDocument: vi.fn().mockReturnValue(mockDisposable),
      textDocuments: [],
      applyEdit: vi.fn().mockResolvedValue(true),
    },
    window: {
      showErrorMessage: vi.fn(),
    },
    WorkspaceEdit: vi.fn().mockImplementation(() => ({
      replace: vi.fn(),
    })),
    Range: vi.fn().mockImplementation((start: unknown, end: unknown) => ({ start, end })),
    Uri: {
      file: vi.fn().mockImplementation((path: string) => ({
        toString: () => path,
        fsPath: path,
      })),
    },
  };
});

// Import after mocking
import { SyncController } from './syncController';
import * as vscode from 'vscode';

describe('SyncController', () => {
  let controller: SyncController;
  let messageHandler: ((message: { type: string; content?: string }) => void) | null = null;
  let documentChangeHandler: ((event: { document: { uri: { toString: () => string } } }) => void) | null = null;
  let visibilityHandler: ((event: { webviewPanel: { visible: boolean } }) => void) | null = null;

  const mockDocument = {
    uri: { toString: () => 'file:///test.md', fsPath: '/test.md' },
    getText: vi.fn().mockReturnValue('# Initial Content'),
    positionAt: vi.fn().mockImplementation((offset: number) => ({ line: 0, character: offset })),
  };

  const mockPostMessage = vi.fn();
  const mockDisposable = { dispose: vi.fn() };

  const mockPanel = {
    webview: {
      postMessage: mockPostMessage,
      onDidReceiveMessage: vi.fn().mockImplementation((handler) => {
        messageHandler = handler;
        return mockDisposable;
      }),
    },
    visible: true,
    onDidChangeViewState: vi.fn().mockImplementation((handler) => {
      visibilityHandler = handler;
      return mockDisposable;
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    messageHandler = null;
    documentChangeHandler = null;
    visibilityHandler = null;

    // Set up textDocuments to return our mock document
    (vscode.workspace as any).textDocuments = [mockDocument];

    // Capture document change handler
    (vscode.workspace.onDidChangeTextDocument as any).mockImplementation((handler: any) => {
      documentChangeHandler = handler;
      return mockDisposable;
    });

    controller = new SyncController(
      mockDocument as any,
      mockPanel as any
    );
  });

  afterEach(async () => {
    await controller.dispose();
  });

  describe('initialization', () => {
    it('should set up message handling', () => {
      expect(mockPanel.webview.onDidReceiveMessage).toHaveBeenCalled();
    });

    it('should set up document watcher', () => {
      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
    });

    it('should set up visibility handler', () => {
      expect(mockPanel.onDidChangeViewState).toHaveBeenCalled();
    });

    it('should read debounce delay from config', () => {
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('nextgenMdPreviewer');
    });
  });

  describe('message handling', () => {
    it('should send content to webview on "ready" message', () => {
      expect(messageHandler).not.toBeNull();
      messageHandler!({ type: 'ready' });

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'contentUpdate',
        content: '# Initial Content',
      });
    });

    it('should debounce content changes', async () => {
      expect(messageHandler).not.toBeNull();

      // Send multiple rapid changes
      messageHandler!({ type: 'contentChanged', content: 'Change 1' });
      messageHandler!({ type: 'contentChanged', content: 'Change 2' });
      messageHandler!({ type: 'contentChanged', content: 'Change 3' });

      // Wait for debounce (100ms + buffer)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should only apply once (the last change)
      expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    });

    it('should queue pending content on rapid changes', async () => {
      expect(messageHandler).not.toBeNull();

      messageHandler!({ type: 'contentChanged', content: 'First change' });

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('document watching', () => {
    it('should send content to webview on external document change', () => {
      expect(documentChangeHandler).not.toBeNull();
      mockPostMessage.mockClear();

      // Simulate external document change
      documentChangeHandler!({ document: { uri: { toString: () => 'file:///test.md' } } });

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'contentUpdate',
        content: '# Initial Content',
      });
    });

    it('should ignore changes to other documents', () => {
      expect(documentChangeHandler).not.toBeNull();
      mockPostMessage.mockClear();

      // Simulate change to a different document
      documentChangeHandler!({ document: { uri: { toString: () => 'file:///other.md' } } });

      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('visibility handling', () => {
    it('should not send content when panel is not visible', () => {
      mockPanel.visible = false;
      mockPostMessage.mockClear();

      // Trigger a document change
      if (documentChangeHandler) {
        documentChangeHandler({ document: { uri: { toString: () => 'file:///test.md' } } });
      }

      // Should not post message when not visible
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should resync when panel becomes visible after being hidden', () => {
      mockPanel.visible = false;
      mockPostMessage.mockClear();

      // Trigger a document change while hidden
      if (documentChangeHandler) {
        documentChangeHandler({ document: { uri: { toString: () => 'file:///test.md' } } });
      }

      // Now simulate panel becoming visible
      mockPanel.visible = true;
      if (visibilityHandler) {
        visibilityHandler({ webviewPanel: { visible: true } });
      }

      // Should now post message
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'contentUpdate',
        content: '# Initial Content',
      });
    });
  });

  describe('dispose', () => {
    it('should flush pending changes on dispose', async () => {
      expect(messageHandler).not.toBeNull();

      // Queue a change
      messageHandler!({ type: 'contentChanged', content: 'Pending change' });

      // Dispose immediately (before debounce timeout)
      await controller.dispose();

      // Should have flushed the pending change
      expect(vscode.workspace.applyEdit).toHaveBeenCalled();
    });

    it('should dispose all subscriptions', async () => {
      await controller.dispose();

      expect(mockDisposable.dispose).toHaveBeenCalled();
    });
  });
});

describe('SyncController - content comparison', () => {
  it('should not apply changes when content is identical', async () => {
    const mockDocument = {
      uri: { toString: () => 'file:///test.md', fsPath: '/test.md' },
      getText: vi.fn().mockReturnValue('# Same Content'),
      positionAt: vi.fn().mockImplementation((offset: number) => ({ line: 0, character: offset })),
    };

    const mockPostMessage = vi.fn();
    const mockDisposable = { dispose: vi.fn() };
    let capturedHandler: ((msg: { type: string; content?: string }) => void) | null = null;

    const mockPanel = {
      webview: {
        postMessage: mockPostMessage,
        onDidReceiveMessage: vi.fn().mockImplementation((handler) => {
          capturedHandler = handler;
          return mockDisposable;
        }),
      },
      visible: true,
      onDidChangeViewState: vi.fn().mockReturnValue(mockDisposable),
    };

    (vscode.workspace as any).textDocuments = [mockDocument];
    (vscode.workspace.applyEdit as any).mockClear();

    const ctrl = new SyncController(mockDocument as any, mockPanel as any);

    // Send content that matches current document
    if (capturedHandler) {
      capturedHandler({ type: 'contentChanged', content: '# Same Content' });
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should not apply edit when content is the same
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();

    await ctrl.dispose();
  });
});
