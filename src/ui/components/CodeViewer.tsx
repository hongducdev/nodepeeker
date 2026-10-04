import React, { useState, useEffect, useRef } from 'react';
import { NodeInspectionData, PreferredPlatform } from '../../types/messages';
import {
  transpileToReactNative,
  transpileToFlutter,
  transpileToSwiftUI,
  transpileToCompose,
} from '../../utils/transpilers';
import { getPlatformToken } from '../../utils/transpilers/token-utils';
import { Code2, Copy, Check, ChevronDown, Coins } from 'lucide-react';
import { CodeHighlighter } from './CodeHighlighter';
import { SvgPreview } from './SvgPreview';

interface CodeViewerProps {
  data: NodeInspectionData;
  /** Lazily fetched SVG markup for the current node, once requested. */
  svg?: string;
  isSvgLoading?: boolean;
  onRequestSvg?: () => void;
  onCopy: (val: string, label: string) => void;
  copiedText: string | null;
  preferredPlatform?: PreferredPlatform;
  onSelectPlatform?: (platform: PreferredPlatform) => void;
}

type CodeTab =
  | 'css'
  | 'react-native'
  | 'flutter'
  | 'swiftui'
  | 'compose'
  | 'svg';

const PRIMARY_TABS: readonly 'css'[] = ['css'];

const MOBILE_TABS: readonly ('react-native' | 'flutter' | 'swiftui' | 'compose')[] = [
  'react-native',
  'flutter',
  'swiftui',
  'compose',
];

const TAB_META: Record<
  CodeTab,
  { label: string; digit?: string; letter?: string; copyLabel: string }
> = {
  css: { label: 'CSS', digit: '1', letter: 'c', copyLabel: 'CSS styles' },
  'react-native': { label: 'React Native', digit: '2', letter: 'r', copyLabel: 'React Native StyleSheet' },
  flutter: { label: 'Flutter', digit: '4', letter: 'f', copyLabel: 'Flutter code' },
  swiftui: { label: 'SwiftUI', digit: '5', copyLabel: 'SwiftUI code' },
  compose: { label: 'Compose', digit: '6', copyLabel: 'Compose code' },
  svg: { label: 'SVG', digit: '3', letter: 's', copyLabel: 'SVG markup' },
};

function substituteToken(prop: string, val: string, varMap: Map<string, string>): string {
  if (varMap.size === 0) return `${prop}: ${val};`;

  if ((prop === 'background-color' || prop === 'background') && varMap.has('fill')) {
    return `${prop}: ${varMap.get('fill')}; /* ${val} */`;
  }
  if (prop === 'border-color' && varMap.has('stroke')) {
    return `${prop}: ${varMap.get('stroke')}; /* ${val} */`;
  }
  if (prop === 'border' && varMap.has('stroke')) {
    const token = varMap.get('stroke')!;
    const sub = val.replace(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/, token);
    return `${prop}: ${sub}; /* ${val} */`;
  }
  if (prop === 'width' && varMap.has('width')) {
    return `width: ${varMap.get('width')}; /* ${val} */`;
  }
  if (prop === 'height' && varMap.has('height')) {
    return `height: ${varMap.get('height')}; /* ${val} */`;
  }
  if (prop === 'padding' && varMap.has('padding')) {
    return `padding: ${varMap.get('padding')}; /* ${val} */`;
  }
  if (prop === 'gap' && varMap.has('itemSpacing')) {
    return `gap: ${varMap.get('itemSpacing')}; /* ${val} */`;
  }
  if (prop === 'border-radius' && varMap.has('cornerRadius')) {
    return `border-radius: ${varMap.get('cornerRadius')}; /* ${val} */`;
  }
  if (prop === 'opacity' && varMap.has('opacity')) {
    return `opacity: ${varMap.get('opacity')}; /* ${val} */`;
  }

  return `${prop}: ${val};`;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  data,
  svg,
  isSvgLoading,
  onRequestSvg,
  onCopy,
  copiedText,
  preferredPlatform,
  onSelectPlatform,
}) => {
  // Default to user's preferred platform (CSS for web, or mobile framework for mobile dev)
  const [tab, setTab] = useState<CodeTab>(() => {
    if (preferredPlatform && preferredPlatform !== 'css') {
      return preferredPlatform;
    }
    return 'css';
  });
  // Tokens active by default so project variables are always visible immediately
  const [useTokens, setUseTokens] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasVariables = Boolean(data.variables && data.variables.length > 0);

  useEffect(() => {
    if (preferredPlatform && tab !== 'svg' && tab !== preferredPlatform) {
      setTab(preferredPlatform);
    }
  }, [preferredPlatform]);

  const handleTabChange = (nextTab: CodeTab) => {
    setTab(nextTab);
    if (nextTab !== 'svg') {
      onSelectPlatform?.(nextTab as PreferredPlatform);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  const formatCss = () => {
    const cssMap: Record<string, string> = { ...data.css };
    if (data.border && !cssMap['border'] && !cssMap['border-top']) {
      const { strokeWeight, individualWeights, strokeStyle, color } = data.border;
      if (individualWeights) {
        if (individualWeights.top > 0) cssMap['border-top'] = `${individualWeights.top}px ${strokeStyle} ${color}`;
        if (individualWeights.right > 0) cssMap['border-right'] = `${individualWeights.right}px ${strokeStyle} ${color}`;
        if (individualWeights.bottom > 0) cssMap['border-bottom'] = `${individualWeights.bottom}px ${strokeStyle} ${color}`;
        if (individualWeights.left > 0) cssMap['border-left'] = `${individualWeights.left}px ${strokeStyle} ${color}`;
      } else if (strokeWeight > 0) {
        cssMap['border'] = `${strokeWeight}px ${strokeStyle} ${color}`;
      }
    }
    const entries = Object.entries(cssMap);
    if (entries.length === 0) {
      return `/* Dimensions */\nwidth: ${data.boxModel.width}px;\nheight: ${data.boxModel.height}px;`;
    }

    const varMap = new Map<string, string>();
    if (useTokens && data.variables && data.variables.length > 0) {
      for (const v of data.variables) {
        varMap.set(v.field, v.cssVariable);
      }
    }

    return entries
      .map(([prop, val]) => (useTokens ? substituteToken(prop, val, varMap) : `${prop}: ${val};`))
      .join('\n');
  };

  const codeByTab: Record<CodeTab, string> = {
    css: formatCss(),
    'react-native': transpileToReactNative(data, { useTokens }),
    flutter: transpileToFlutter(data, { useTokens }),
    swiftui: transpileToSwiftUI(data, { useTokens }),
    compose: transpileToCompose(data, { useTokens }),
    svg: svg ?? '',
  };
  const activeCode = codeByTab[tab];
  const isCopied = copiedText === activeCode;
  const isMobileTab = MOBILE_TABS.includes(tab as (typeof MOBILE_TABS)[number]);

  // Fetch the markup the first time the SVG tab is shown, and again when the node changes.
  useEffect(() => {
    if (tab === 'svg' && !svg && !isSvgLoading) {
      onRequestSvg?.();
    }
  }, [tab, svg, isSvgLoading, onRequestSvg]);

  // Keyboard shortcuts: 1/C CSS, 2/T Tailwind, 3/S SVG, Ctrl/Cmd+C copy active code.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      const isPlain = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (isPlain) {
        const allTabs: CodeTab[] = ['css', 'svg', 'react-native', 'flutter', 'swiftui', 'compose'];
        const next = allTabs.find(
          (id) => TAB_META[id].digit === e.key || (TAB_META[id].letter && TAB_META[id].letter === key)
        );
        if (next) {
          handleTabChange(next);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey || e.altKey) && key === 'c') {
        // If the user has highlighted a specific piece of text, let the browser's
        // native copy handler handle it instead of replacing it with the entire code block.
        const selection = window.getSelection ? window.getSelection()?.toString() : '';
        if (selection && selection.length > 0) {
          return;
        }

        // Mirror the Copy button's disabled state: never copy an empty tab
        // (e.g. a node whose SVG export failed), which would clear the
        // clipboard and report a copy that did not happen.
        if (activeCode) {
          onCopy(activeCode, TAB_META[tab].copyLabel);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCode, tab, onCopy]);

  return (
    <div className="p-3 border-b border-surface0">
      <div className="flex items-center justify-between mb-2 gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <Code2 size={12} className="text-overlay1 shrink-0" />
          <div className="flex rounded bg-surface0 p-0.5 text-[10px] font-medium shrink-0">
            {PRIMARY_TABS.map((id) => {
              const meta = TAB_META[id];
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
                    isActive
                      ? 'bg-surface2 text-blue font-semibold shadow-xs'
                      : 'text-overlay1 hover:text-text'
                  }`}
                  title={`Shortcut: Press '${meta.digit}' or '${meta.letter?.toUpperCase()}'`}
                >
                  <span>{meta.label}</span>
                  <kbd className="text-[8px] font-mono opacity-50 px-0.5 py-0.2 rounded bg-surface1/60">
                    {meta.digit}
                  </kbd>
                </button>
              );
            })}

            {/* Mobile Dropdown */}
            <div className="relative flex items-center" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition text-[10px] font-medium ${
                  isMobileTab
                    ? 'bg-surface2 text-blue font-semibold shadow-xs'
                    : 'text-overlay1 hover:text-text'
                }`}
                title="Mobile frameworks (React Native, Flutter, SwiftUI, Compose)"
              >
                <span>{isMobileTab ? TAB_META[tab].label : 'Mobile'}</span>
                <ChevronDown
                  size={9}
                  className={`text-overlay1 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {mobileOpen && (
                <div className="absolute top-full left-0 mt-1 w-32 rounded-lg bg-surface0 border border-surface1 shadow-xl py-1 z-30 animate-in fade-in slide-in-from-top-1 text-xs">
                  {MOBILE_TABS.map((mTab) => {
                    const isSelected = tab === mTab;
                    return (
                      <button
                        key={mTab}
                        type="button"
                        onClick={() => {
                          handleTabChange(mTab);
                          setMobileOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between text-[11px] transition ${
                          isSelected
                            ? 'bg-surface1 text-blue font-semibold'
                            : 'text-subtext0 hover:text-text hover:bg-surface1/60'
                        }`}
                      >
                        <span>{TAB_META[mTab].label}</span>
                        {isSelected && <Check size={11} className="text-blue" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SVG Tab */}
            {(() => {
              const meta = TAB_META['svg'];
              const isActive = tab === 'svg';
              return (
                <button
                  onClick={() => setTab('svg')}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
                    isActive
                      ? 'bg-surface2 text-blue font-semibold shadow-xs'
                      : 'text-overlay1 hover:text-text'
                  }`}
                  title={`Shortcut: Press '${meta.digit}' or '${meta.letter?.toUpperCase()}'`}
                >
                  <span>{meta.label}</span>
                  <kbd className="text-[8px] font-mono opacity-50 px-0.5 py-0.2 rounded bg-surface1/60">
                    {meta.digit}
                  </kbd>
                </button>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasVariables && (
            <button
              type="button"
              onClick={() => setUseTokens(!useTokens)}
              className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded transition ${
                useTokens
                  ? 'bg-peach/20 text-peach border border-peach/40 font-semibold'
                  : 'bg-surface0 text-subtext0 hover:text-text hover:bg-surface1 border border-surface1/60'
              }`}
              title={useTokens ? 'Showing project tokens (click for raw values)' : 'Show project variables / tokens'}
            >
              <Coins size={11} className={useTokens ? 'text-peach' : 'text-overlay1'} />
              <span>Tokens</span>
            </button>
          )}

          <button
            onClick={() => onCopy(activeCode, TAB_META[tab].copyLabel)}
            disabled={!activeCode}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-surface0 hover:bg-surface1 text-subtext1 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Copy to clipboard (Ctrl+C / Cmd+C)"
          >
            {isCopied ? (
              <>
                <Check size={11} className="text-green" />
                <span className="text-green">{tab === 'svg' ? 'Copied SVG' : 'Copied'}</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>{tab === 'svg' ? 'Copy SVG' : 'Copy'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* The rendering sits above the markup it was produced from: on the SVG tab most of the
          code box is one enormous `<path d=…>` line, so the visual answer goes first. */}
      {tab === 'svg' && svg ? <SvgPreview markup={svg} /> : null}

      <div className="relative rounded-md bg-crust text-text p-2.5 overflow-x-auto max-h-56 scrollbar-thin border border-surface0 select-text">
        {tab === 'svg' && isSvgLoading && !svg ? (
          <span className="text-overlay1 italic">Loading SVG…</span>
        ) : (
          <CodeHighlighter code={activeCode} language={tab} />
        )}
      </div>

      {hasVariables && (
        <div className="mt-1.5 pt-1.5 border-t border-surface0/60 flex flex-wrap items-center gap-1">
          <span className="text-[9px] font-mono uppercase text-overlay1 shrink-0">Tokens:</span>
          {data.variables!.map((v, i) => {
            const displayToken = isMobileTab
              ? getPlatformToken(v, tab as 'react-native' | 'flutter' | 'swiftui' | 'compose')
              : v.cssVariable;
            return (
              <button
                key={`${v.id}-${i}`}
                type="button"
                onClick={() => onCopy(displayToken, v.variableName)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface0/80 hover:bg-surface1 text-[9px] font-mono text-subtext0 hover:text-text transition border border-surface1/60"
                title={`Click to copy ${displayToken} (${v.variableName})`}
              >
                <span className="text-peach font-medium">{displayToken}</span>
                {v.variableName && (
                  <span className="text-overlay1 font-sans text-[8px]">({v.variableName})</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
