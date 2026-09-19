import type { DistanceMeasurement } from '../utils/distance';

export interface ColorToken {
  hex: string;
  rgba: string;
  hsl: string;
  opacity: number;
  source: 'fill' | 'stroke';
  name?: string;
}

export interface BoxModelData {
  width: number;
  height: number;
  x: number;
  y: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  gap: number;
  cornerRadius: number | [number, number, number, number];
}

export interface TypographyData {
  fontFamily: string;
  fontWeight: string | number;
  fontSize: number;
  lineHeight?: number | string;
  letterSpacing?: number | string;
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
}

export interface BorderData {
  strokeWeight: number;
  individualWeights?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  dashPattern?: number[];
  color: string;
  opacity?: number;
}

/** A real Figma shadow effect, reported verbatim rather than rounded to a preset. */
export interface ShadowData {
  inner: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

export interface NodeInspectionData {
  id: string;
  name: string;
  type: string;
  css: Record<string, string>;
  colors: ColorToken[];
  boxModel: BoxModelData;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisAlign?: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
  counterAxisAlign?: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE';
  layoutGrow?: number;
  layoutAlign?: 'STRETCH' | 'INHERIT';
  typography?: TypographyData;
  border?: BorderData;
  /** 0..1. Independent of shadows -- a translucent node need not have one. */
  opacity?: number;
  shadows?: ShadowData[];
  /** Auto-layout Hug sizing (`primaryAxisSizingMode` / `counterAxisSizingMode` = AUTO). */
  sizing?: { hugHorizontal: boolean; hugVertical: boolean };
  /** Child of an auto-layout frame pinned with `layoutPositioning: 'ABSOLUTE'`. */
  position?: { absolute: boolean };
  /** Present only when the selection resolves to a frame Figma can actually encode: a frame
   *  placed directly on a page that carries Motion/timeline animation. Prototype-only Smart
   *  Animate flows are not resolvable by `exportAsync`, so `reactions` is deliberately not a
   *  signal here. Presence gates the animation-export UI, so a static frame offers no dead
   *  action. */
  video?: {
    frameId: string;
    frameName: string;
    durationSeconds?: number;
    initialFormat?: VideoFormat;
    isDirectMedia?: boolean;
    /** The selection paints a real video; its bytes are unreadable to plugins, so the UI can
     *  point at Dev Mode's asset download for the original file. */
    hasVideoFill?: boolean;
  };
}

export type VideoFormat = 'MP4' | 'GIF';
export type VideoQuality = 'LOW' | 'MEDIUM' | 'HIGH';
/** Must stay in sync with `SCALE_VALUES` in `src/utils/video-options.ts`. */
export type VideoScale = 0.5 | 0.75 | 1 | 1.5 | 2 | 3 | 4;

export interface VideoExportOptions {
  format: VideoFormat;
  fps: number;
  quality: VideoQuality;
  /** GIF only; 0 loops forever. */
  loopCount: number;
  scale: VideoScale;
}

/** A two-node selection is a different question from a one-node selection -- it is about the
 *  relationship between layers, not about one layer -- so it gets its own case rather than an
 *  optional field on the single-node payload. */
export type SelectionState =
  | { kind: 'single'; data: NodeInspectionData }
  | { kind: 'pair'; measurement: DistanceMeasurement }
  | { kind: 'none'; count: number };

/** Document-level metadata. Constant for the session, so it is sent once rather than
 *  riding along on every selection change. `fileKey` is absent unless the manifest sets
 *  `enablePrivatePluginApi` and the plugin is private. */
export interface FileContext {
  fileKey?: string;
  fileName: string;
}

export type BridgeStatus =
  | 'needs-token'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'disabled';

export interface BridgeStatePayload {
  state: BridgeStatus;
  detail?: string | null;
  seq?: number;
  enabled: boolean;
}

export type PluginToUIMessage =
  | { type: 'SELECTION_CHANGE'; payload: SelectionState }
  | { type: 'FILE_CONTEXT'; payload: FileContext }
  | { type: 'BRIDGE_STATUS'; payload: BridgeStatePayload }
  | {
      type: 'EXPORT_RESULT';
      payload:
        | { format: 'SVG'; content: string; name: string; nodeId: string; action: 'copy' | 'download' | 'view' }
        | { format: 'PNG'; bytes: Uint8Array; name: string; action: 'download' };
    }
  | { type: 'VIDEO_EXPORT_RESULT'; payload: { format: VideoFormat; bytes: Uint8Array; name: string } }
  | { type: 'EXPORT_ERROR'; error: string };

export type UIToPluginMessage =
  | {
      type: 'REQUEST_EXPORT';
      format: 'SVG' | 'PNG';
      scale?: number;
      action: 'copy' | 'download' | 'view';
    }
  | { type: 'REQUEST_VIDEO_EXPORT'; options: VideoExportOptions }
  | { type: 'SET_BRIDGE_TOKEN'; token: string }
  | { type: 'TOGGLE_BRIDGE'; enabled: boolean }
  | { type: 'INIT_REQUEST' };
