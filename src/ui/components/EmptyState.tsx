import React from 'react';
import { MousePointerClick, Layers, Bot } from 'lucide-react';
import type { BridgeStatus } from '../../types/messages';

interface EmptyStateProps {
  count?: number;
  bridgeStatus?: BridgeStatus;
  onOpenBridge?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  count = 0,
  bridgeStatus,
  onOpenBridge,
}) => {
  if (count > 1) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-[420px]">
        <div className="w-12 h-12 rounded-full bg-surface0 flex items-center justify-center mb-3 text-overlay1">
          <Layers size={22} />
        </div>
        <h2 className="text-sm font-semibold text-text mb-1">
          {count} Layers Selected
        </h2>
        <p className="text-xs text-overlay1 max-w-[220px] leading-relaxed">
          Please select a single layer on the canvas for detailed code inspection and export.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center h-[420px]">
      <div className="w-12 h-12 rounded-full bg-blue/15 border border-blue/30 flex items-center justify-center mb-3 text-blue animate-pulse">
        <MousePointerClick size={22} />
      </div>

      <h2 className="text-sm font-semibold text-text mb-1">
        Select a layer to inspect
      </h2>
      <p className="text-xs text-overlay1 max-w-[220px] leading-relaxed mb-6">
        Click any frame, component, or text on the canvas to inspect code, colors, and layout.
      </p>

      <div className="w-full max-w-[240px] space-y-2 text-left text-[11px] text-subtext0 bg-mantle/60 p-3 rounded-lg border border-surface0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue shrink-0" />
          <span>Tailwind CSS & pure CSS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0" />
          <span>Interactive box model & gaps</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-peach shrink-0" />
          <span>1-click HEX/RGB/HSL color copier</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-mauve shrink-0" />
          <span>Instant SVG code & 2x PNG export</span>
        </div>
      </div>

      <div className="w-full max-w-[240px] mt-3 p-2 rounded-lg bg-blue/10 border border-blue/30 text-[10px] text-blue flex items-center justify-between">
        <span>Quick open in Figma:</span>
        <kbd className="font-mono px-1.5 py-0.5 rounded bg-base border border-blue/40 text-text">
          Ctrl+Alt+P / ⌥⌘P
        </kbd>
      </div>

      {onOpenBridge && (
        <div className="w-full max-w-[240px] mt-2.5 p-2 rounded-lg bg-surface0/60 border border-surface1 text-[10px] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                bridgeStatus === 'connected'
                  ? 'bg-green animate-pulse'
                  : bridgeStatus === 'connecting' || bridgeStatus === 'needs-token'
                    ? 'bg-peach'
                    : bridgeStatus === 'disabled'
                      ? 'bg-overlay0'
                      : 'bg-maroon'
              }`}
            />
            <Bot size={12} className="text-overlay1" />
            <span className="text-subtext0 font-medium">MCP Bridge</span>
          </div>
          <button
            onClick={onOpenBridge}
            className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-surface1 hover:bg-surface2 text-subtext1 transition"
          >
            {bridgeStatus === 'connected' ? 'CONNECTED' : 'SETTINGS'}
          </button>
        </div>
      )}
    </div>
  );
};
