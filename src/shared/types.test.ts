import { describe, it, expect } from 'vitest';
import type {
  WebviewToExtensionMessage,
  ExtensionToWebviewMessage,
  EditorConfig,
} from './types';

describe('Message Types', () => {
  describe('WebviewToExtensionMessage', () => {
    it('should accept contentChanged message', () => {
      const message: WebviewToExtensionMessage = {
        type: 'contentChanged',
        content: '# Hello World',
      };

      expect(message.type).toBe('contentChanged');
      expect(message.content).toBe('# Hello World');
    });

    it('should accept ready message without content', () => {
      const message: WebviewToExtensionMessage = {
        type: 'ready',
      };

      expect(message.type).toBe('ready');
      expect(message.content).toBeUndefined();
    });
  });

  describe('ExtensionToWebviewMessage', () => {
    it('should accept contentUpdate message', () => {
      const message: ExtensionToWebviewMessage = {
        type: 'contentUpdate',
        content: '# Updated Content',
      };

      expect(message.type).toBe('contentUpdate');
      expect(message.content).toBe('# Updated Content');
    });

    it('should accept configUpdate message with config', () => {
      const config: EditorConfig = {
        autoSaveDelay: 1000,
        toolbar: {
          visible: true,
          position: 'top',
        },
        features: {
          math: true,
          mermaid: false,
        },
        images: {
          folder: 'assets',
        },
      };

      const message: ExtensionToWebviewMessage = {
        type: 'configUpdate',
        config,
      };

      expect(message.type).toBe('configUpdate');
      expect(message.config).toEqual(config);
    });
  });

  describe('EditorConfig', () => {
    it('should have valid default-like structure', () => {
      const config: EditorConfig = {
        autoSaveDelay: 1000,
        toolbar: {
          visible: true,
          position: 'floating',
        },
        features: {
          math: true,
          mermaid: true,
        },
        images: {
          folder: 'assets',
        },
      };

      expect(config.autoSaveDelay).toBeGreaterThan(0);
      expect(['top', 'floating']).toContain(config.toolbar.position);
      expect(typeof config.toolbar.visible).toBe('boolean');
      expect(typeof config.features.math).toBe('boolean');
      expect(typeof config.features.mermaid).toBe('boolean');
      expect(typeof config.images.folder).toBe('string');
    });
  });
});

// Type guard functions for runtime validation
function isWebviewToExtensionMessage(obj: unknown): obj is WebviewToExtensionMessage {
  if (typeof obj !== 'object' || obj === null) return false;
  const msg = obj as Record<string, unknown>;
  return (
    (msg.type === 'contentChanged' || msg.type === 'ready') &&
    (msg.content === undefined || typeof msg.content === 'string')
  );
}

function isExtensionToWebviewMessage(obj: unknown): obj is ExtensionToWebviewMessage {
  if (typeof obj !== 'object' || obj === null) return false;
  const msg = obj as Record<string, unknown>;
  return (
    (msg.type === 'contentUpdate' || msg.type === 'configUpdate') &&
    (msg.content === undefined || typeof msg.content === 'string')
  );
}

describe('Type Guards', () => {
  describe('isWebviewToExtensionMessage', () => {
    it('should return true for valid contentChanged message', () => {
      expect(isWebviewToExtensionMessage({ type: 'contentChanged', content: 'test' })).toBe(true);
    });

    it('should return true for valid ready message', () => {
      expect(isWebviewToExtensionMessage({ type: 'ready' })).toBe(true);
    });

    it('should return false for invalid type', () => {
      expect(isWebviewToExtensionMessage({ type: 'invalid' })).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isWebviewToExtensionMessage('string')).toBe(false);
      expect(isWebviewToExtensionMessage(null)).toBe(false);
      expect(isWebviewToExtensionMessage(undefined)).toBe(false);
    });
  });

  describe('isExtensionToWebviewMessage', () => {
    it('should return true for valid contentUpdate message', () => {
      expect(isExtensionToWebviewMessage({ type: 'contentUpdate', content: 'test' })).toBe(true);
    });

    it('should return true for valid configUpdate message', () => {
      expect(isExtensionToWebviewMessage({ type: 'configUpdate' })).toBe(true);
    });

    it('should return false for invalid type', () => {
      expect(isExtensionToWebviewMessage({ type: 'invalid' })).toBe(false);
    });
  });
});
