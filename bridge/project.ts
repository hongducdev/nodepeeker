import type { NodeInspectionData } from '../src/types/messages.js';
import { transpileToTailwind } from '../src/utils/tailwind-transpiler.js';
import {
  transpileToReactNative,
  transpileToFlutter,
  transpileToSwiftUI,
  transpileToCompose,
} from '../src/utils/transpilers/index.js';
import type { ViewName } from './protocol.js';

/**
 * Projects one `NodeInspectionData` down to the requested view.
 *
 * Projection lives here — broker-side — rather than in the plugin, for two reasons:
 *   1. The plugin sends exactly one payload shape, so there is no second extraction path to drift.
 *   2. Every view becomes a pure function over data the plugin already returns, which means the
 *      token-budget behaviour is testable without Figma.
 *
 * `tailwind` reuses NodePeeker's own `transpileToTailwind` — the same function the plugin's
 * Tailwind tab calls, so the agent and the panel can never disagree.
 */

/** The cheap default. Roughly 60 tokens against `full`'s low thousands. */
export interface NodeSummary {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  layoutMode?: string;
  padding?: string;
  gap?: number;
  radius?: number | number[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function toSummary(data: NodeInspectionData): NodeSummary {
  const { boxModel } = data;
  const pad = [boxModel.paddingTop, boxModel.paddingRight, boxModel.paddingBottom, boxModel.paddingLeft];
  const uniform = pad.every((p) => p === pad[0]);

  const summary: NodeSummary = {
    id: data.id,
    name: data.name,
    type: data.type,
    width: round2(boxModel.width),
    height: round2(boxModel.height),
  };

  if (data.layoutMode && data.layoutMode !== 'NONE') summary.layoutMode = data.layoutMode;
  if (pad.some((p) => p > 0)) summary.padding = uniform ? `${pad[0]}px` : pad.map((p) => `${p}px`).join(' ');
  if (boxModel.gap > 0) summary.gap = round2(boxModel.gap);
  if (typeof boxModel.cornerRadius === 'number') {
    if (boxModel.cornerRadius > 0) summary.radius = round2(boxModel.cornerRadius);
  } else {
    summary.radius = boxModel.cornerRadius.map(round2);
  }

  return summary;
}

export type ProjectedView =
  | NodeSummary
  | { id: string; name: string; tailwind: string }
  | { id: string; name: string; css: Record<string, string> }
  | { id: string; name: string; reactNative: string }
  | { id: string; name: string; flutter: string }
  | { id: string; name: string; swiftUI: string }
  | { id: string; name: string; compose: string }
  | NodeInspectionData;

/** Returns whatever the MCP tool should serialize for this view. */
export function projectView(data: NodeInspectionData, view: ViewName): ProjectedView {
  switch (view) {
    case 'summary':
      return toSummary(data);
    case 'tailwind':
      return { id: data.id, name: data.name, tailwind: transpileToTailwind(data) };
    case 'css':
      return { id: data.id, name: data.name, css: data.css };
    case 'react-native':
      return { id: data.id, name: data.name, reactNative: transpileToReactNative(data) };
    case 'flutter':
      return { id: data.id, name: data.name, flutter: transpileToFlutter(data) };
    case 'swiftui':
      return { id: data.id, name: data.name, swiftUI: transpileToSwiftUI(data) };
    case 'compose':
      return { id: data.id, name: data.name, compose: transpileToCompose(data) };
    case 'full':
      return data;
    default:
      return data;
  }
}
