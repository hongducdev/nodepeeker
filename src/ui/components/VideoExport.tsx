import React, { useState } from 'react';
import { Film, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { VideoFormat, VideoQuality, VideoExportOptions, VideoScale } from '../../types/messages';
import {
  DEFAULT_FPS,
  FPS_BY_FORMAT,
  QUALITY_OPTIONS,
  SCALE_VALUES,
  clampFps,
  supportsQuality,
} from '../../utils/video-options';

interface VideoExportProps {
  /** The frame Figma will encode, plus its detected motion duration. */
  video: { frameId: string; frameName: string; durationSeconds?: number };
  onExport: (options: VideoExportOptions) => void;
  isExporting: boolean;
}

const FORMATS: ReadonlyArray<{ id: VideoFormat; label: string; icon: typeof Film }> = [
  { id: 'MP4', label: 'MP4', icon: Film },
  { id: 'GIF', label: 'GIF', icon: ImageIcon },
];

export const VideoExport: React.FC<VideoExportProps> = ({ video, onExport, isExporting }) => {
  const [format, setFormat] = useState<VideoFormat>('MP4');
  const [fps, setFps] = useState(DEFAULT_FPS.MP4);
  const [quality, setQuality] = useState<VideoQuality>('HIGH');
  const [loopCount, setLoopCount] = useState(0);
  const [scale, setScale] = useState<VideoScale>(1);

  const selectFormat = (next: VideoFormat) => {
    setFormat(next);
    // fps sets differ per format, so re-snap when switching.
    setFps(clampFps(next, fps));
  };

  const handleExport = () => {
    onExport({ format, fps: clampFps(format, fps), quality, loopCount, scale });
  };

  return (
    <div className="p-3 border-b border-surface0">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-overlay1 mb-2">
        <Film size={12} />
        <span>Animation Export</span>
      </div>

      <p className="mb-2 text-[9px] leading-tight text-overlay0">
        Detected motion in{' '}
        <span className="font-mono text-subtext0">{video.frameName}</span>
        {video.durationSeconds !== undefined && (
          <span className="text-overlay1"> · {video.durationSeconds}s</span>
        )}
        <span className="text-overlay1"> — the whole frame is encoded, not the layer</span>
      </p>

      <div className="flex items-center gap-1 mb-2">
        <div className="flex rounded bg-surface0 p-0.5 text-[11px] font-medium">
          {FORMATS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => selectFormat(id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
                format === id
                  ? 'bg-surface2 text-blue font-semibold shadow-xs'
                  : 'text-overlay1 hover:text-text'
              }`}
            >
              <Icon size={10} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-2 text-[10px]">
        <label className="flex flex-col gap-0.5">
          <span className="text-overlay0">fps</span>
          <select
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            className="rounded bg-surface0 px-1 py-0.5 text-subtext1 outline-none"
          >
            {FPS_BY_FORMAT[format].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        {supportsQuality(format) ? (
          <label className="flex flex-col gap-0.5">
            <span className="text-overlay0">quality</span>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as VideoQuality)}
              className="rounded bg-surface0 px-1 py-0.5 text-subtext1 outline-none"
            >
              {QUALITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-0.5">
            <span className="text-overlay0">loop</span>
            <select
              value={loopCount}
              onChange={(e) => setLoopCount(Number(e.target.value))}
              className="rounded bg-surface0 px-1 py-0.5 text-subtext1 outline-none"
            >
              {/* Labelled by the API's own values: loopCount is "number of times the GIF
                  loops", so 0 means forever. "once" would misstate the GIF convention. */}
              <option value={0}>∞</option>
              <option value={1}>1</option>
              <option value={3}>3</option>
            </select>
          </label>
        )}

        <label className="flex flex-col gap-0.5">
          <span className="text-overlay0">scale</span>
          <select
            value={scale}
            onChange={(e) => setScale(Number(e.target.value) as VideoScale)}
            className="rounded bg-surface0 px-1 py-0.5 text-subtext1 outline-none"
          >
            {SCALE_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}x
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-surface1 bg-surface0 hover:bg-surface1/60 text-subtext1 hover:border-surface2 transition disabled:opacity-50 group"
      >
        {isExporting ? (
          <Loader2 size={13} className="animate-spin text-overlay1" />
        ) : (
          <Film size={13} className="text-mauve group-hover:scale-110 transition" />
        )}
        <span className="text-[10px] font-medium">
          {isExporting ? 'Encoding…' : `Download ${format}`}
        </span>
      </button>
    </div>
  );
};
