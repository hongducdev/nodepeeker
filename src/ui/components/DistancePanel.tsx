import React from 'react';
import { Ruler, Copy } from 'lucide-react';
import { unionBounds, type DistanceMeasurement } from '../../utils/distance';

interface DistancePanelProps {
  measurement: DistanceMeasurement;
  onCopy: (value: string, label: string) => void;
}

const DIRECTION_LABEL: Record<DistanceMeasurement['direction'], string> = {
  right: 'to the right of',
  left: 'to the left of',
  below: 'below',
  above: 'above',
  overlapping: 'overlapping',
};

const MIN_WIDTH_PCT = 6;
const MIN_HEIGHT_PCT = 12;

/**
 * A box's position and size as percentages of the union, so both stay in frame.
 *
 * The minimum size keeps a tiny box visible, which means the position must be clamped too:
 * a floored box near the union's far edge would otherwise start at 99% and extend past the
 * container, and the `overflow-hidden` frame would clip it away entirely.
 */
function relativeBox(
  box: { x: number; y: number; width: number; height: number },
  union: { x: number; y: number; width: number; height: number }
) {
  const pct = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);
  const width = Math.max(pct(box.width, union.width), MIN_WIDTH_PCT);
  const height = Math.max(pct(box.height, union.height), MIN_HEIGHT_PCT);

  return {
    left: `${Math.min(pct(box.x - union.x, union.width), 100 - width)}%`,
    top: `${Math.min(pct(box.y - union.y, union.height), 100 - height)}%`,
    width: `${width}%`,
    height: `${height}%`,
  };
}

export const DistancePanel: React.FC<DistancePanelProps> = ({ measurement, onCopy }) => {
  const { a, b, gapX, gapY, overlap, alignments, direction } = measurement;
  const union = unionBounds(a.bounds, b.bounds);

  const gapLabel = overlap
    ? `overlap ${overlap.width} × ${overlap.height}`
    : gapX > 0 && gapY > 0
      ? `${gapX} × ${gapY} px`
      : gapX > 0
        ? `${gapX} px`
        : `${gapY} px`;

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-overlay1">
          <Ruler size={12} />
          <span>Distance</span>
        </div>
        <button
          onClick={() => onCopy(gapLabel, 'Distance')}
          className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface0 text-subtext1 hover:bg-surface1 transition"
          title="Copy the measured gap"
        >
          <span>{gapLabel}</span>
          <Copy size={10} className="opacity-60" />
        </button>
      </div>

      <p className="mb-2 text-[10px] text-overlay0 truncate">
        <span className="font-mono text-subtext1">{a.name}</span> is {DIRECTION_LABEL[direction]}{' '}
        <span className="font-mono text-subtext1">{b.name}</span>
      </p>

      {/* Mini diagram: both boxes positioned and scaled against their union. */}
      <div className="relative h-24 mb-2 rounded bg-mantle/60 border border-surface0 overflow-hidden">
        <div
          className="absolute rounded border border-blue bg-blue/10"
          style={relativeBox(a.bounds, union)}
        />
        <div
          className="absolute rounded border border-mauve bg-mauve/10"
          style={relativeBox(b.bounds, union)}
        />
      </div>

      <div className="space-y-1 text-[10px] font-mono">
        <Row label="horizontal" value={`${gapX}px`} />
        <Row label="vertical" value={`${gapY}px`} />
        {/* Only shown when the boxes actually intersect; the gaps above read 0 in that case. */}
        {overlap && <Row label="overlap" value={`${overlap.width} × ${overlap.height}px`} />}
        <Row label="edge → edge" value={`${measurement.distance}px`} />
        {alignments.length > 0 && <Row label="aligned" value={alignments.join(', ')} />}
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-overlay0">{label}</span>
    <span className="text-subtext1">{value}</span>
  </div>
);
