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
  effects?: {
    hasDropShadow: boolean;
    shadowType?: 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | 'inner';
    opacity?: number;
  };
  svg?: string;
  border?: BorderData;
}

export type SelectionState =
  | { selected: true; data: NodeInspectionData }
  | { selected: false; count: number };

export type PluginToUIMessage =
  | { type: 'SELECTION_CHANGE'; payload: SelectionState }
  | {
      type: 'EXPORT_RESULT';
      payload:
        | { format: 'SVG'; content: string; name: string; action: 'copy' | 'download' }
        | { format: 'PNG'; bytes: number[]; name: string; action: 'download' };
    }
  | { type: 'EXPORT_ERROR'; error: string };

export type UIToPluginMessage =
  | { type: 'REQUEST_EXPORT'; format: 'SVG' | 'PNG'; scale?: number; action: 'copy' | 'download' }
  | { type: 'INIT_REQUEST' };
