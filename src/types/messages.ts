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
}

export type SelectionState =
  | { selected: true; data: NodeInspectionData }
  | { selected: false; count: number };

/** Document-level metadata. Constant for the session, so it is sent once rather than
 *  riding along on every selection change. `fileKey` is absent unless the manifest sets
 *  `enablePrivatePluginApi` and the plugin is private. */
export interface FileContext {
  fileKey?: string;
  fileName: string;
}

export type PluginToUIMessage =
  | { type: 'SELECTION_CHANGE'; payload: SelectionState }
  | { type: 'FILE_CONTEXT'; payload: FileContext }
  | {
      type: 'EXPORT_RESULT';
      payload:
        | { format: 'SVG'; content: string; name: string; nodeId: string; action: 'copy' | 'download' | 'view' }
        | { format: 'PNG'; bytes: number[]; name: string; action: 'download' };
    }
  | { type: 'EXPORT_ERROR'; error: string };

export type UIToPluginMessage =
  | {
      type: 'REQUEST_EXPORT';
      format: 'SVG' | 'PNG';
      scale?: number;
      action: 'copy' | 'download' | 'view';
    }
  | { type: 'INIT_REQUEST' };
