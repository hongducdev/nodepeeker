import React, { useState, useEffect } from 'react';
import { X, Radio, Check, Power } from 'lucide-react';
import type { BridgeStatePayload } from '../../types/messages';

interface BridgeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bridgeState: BridgeStatePayload;
  onSetToken: (token: string) => void;
  onToggleEnabled: (enabled: boolean) => void;
}

export const BridgeSettingsModal: React.FC<BridgeSettingsModalProps> = ({
  isOpen,
  onClose,
  bridgeState,
  onSetToken,
  onToggleEnabled,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => setIsSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    onSetToken(tokenInput.trim());
    setTokenInput('');
    setIsSaved(true);
  };

  const getStatusBadge = () => {
    switch (bridgeState.state) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green/15 text-green border border-green/30">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-peach/15 text-peach border border-peach/30">
            <span className="w-1.5 h-1.5 rounded-full bg-peach animate-pulse" />
            Connecting
          </span>
        );
      case 'needs-token':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-peach/15 text-peach border border-peach/30">
            <span className="w-1.5 h-1.5 rounded-full bg-peach" />
            Needs Token
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface1 text-overlay1 border border-surface2">
            <span className="w-1.5 h-1.5 rounded-full bg-overlay1" />
            Disabled
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-maroon/15 text-maroon border border-maroon/30">
            <span className="w-1.5 h-1.5 rounded-full bg-maroon" />
            Disconnected
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-base/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-mantle border border-surface1 rounded-xl shadow-2xl w-full max-w-[310px] overflow-hidden text-xs">
        {/* Header */}
        <div className="px-3.5 py-3 border-b border-surface0 flex items-center justify-between bg-surface0/40">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue/15 text-blue">
              <Radio size={14} />
            </div>
            <div>
              <h2 className="font-semibold text-text text-xs">NodePeeker Bridge</h2>
              <p className="text-[10px] text-overlay1">Local MCP Server for AI Agents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-overlay1 hover:text-text hover:bg-surface1 transition"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-3.5">
          {/* Status and Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface0/60 border border-surface1">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-subtext0">Status</div>
              {getStatusBadge()}
            </div>
            <button
              onClick={() => onToggleEnabled(!bridgeState.enabled)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                bridgeState.enabled
                  ? 'bg-blue/15 text-blue border border-blue/30 hover:bg-blue/20'
                  : 'bg-surface1 text-overlay1 border border-surface2 hover:text-text'
              }`}
            >
              <Power size={12} />
              <span>{bridgeState.enabled ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>

          {bridgeState.detail && (
            <p className="text-[10px] text-maroon font-mono px-1 truncate">
              {bridgeState.detail}
            </p>
          )}

          {/* Token input form */}
          <form onSubmit={handleSave} className="space-y-2">
            <label className="block text-[11px] font-medium text-subtext0">
              Broker Token
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste token printed by broker..."
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md bg-surface0 border border-surface1 text-text placeholder:text-overlay0 focus:outline-none focus:border-blue transition select-text"
            />
            <button
              type="submit"
              disabled={!tokenInput.trim()}
              className="w-full py-1.5 px-3 rounded-md bg-blue text-base font-medium text-xs hover:bg-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
            >
              {isSaved ? (
                <>
                  <Check size={13} />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save &amp; Connect</span>
              )}
            </button>
          </form>

          {/* Guide note */}
          <div className="p-2.5 rounded-lg bg-surface0/40 border border-surface0 text-[10px] text-subtext0 space-y-1.5 leading-relaxed">
            <div className="font-semibold text-text flex items-center gap-1">
              <span>Quick Setup</span>
            </div>
            <p>
              1. Run <code className="font-mono bg-surface1 px-1 py-0.5 rounded text-blue">npm run bridge</code> in terminal.
            </p>
            <p>
              2. Copy the printed token and paste above.
            </p>
            <p className="text-overlay1">
              Connects Cursor &amp; pi.dev to Figma via MCP without spending official Figma seat quota.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
