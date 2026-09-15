import { useState, useCallback } from 'react';

export interface ClipboardState {
  copiedText: string | null;
  copiedLabel: string | null;
}

export function useClipboard(timeout = 1800) {
  const [state, setState] = useState<ClipboardState>({
    copiedText: null,
    copiedLabel: null,
  });

  const copy = useCallback(
    async (text: string, label?: string) => {
      let success = false;

      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          success = true;
        } catch {
          success = false;
        }
      }

      if (!success) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-999999px';
          textarea.style.top = '-999999px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          success = document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch {
          success = false;
        }
      }

      if (success) {
        setState({ copiedText: text, copiedLabel: label || text });
        setTimeout(() => {
          setState((prev) => (prev.copiedText === text ? { copiedText: null, copiedLabel: null } : prev));
        }, timeout);
      }

      return success;
    },
    [timeout]
  );

  return { ...state, copy };
}
