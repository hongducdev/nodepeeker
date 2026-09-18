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
  /** The frame Figma will encode, plus its detected motion duration and initial format. Absent when not detected. */
  video?: {
    frameId: string;
    frameName: string;
    durationSeconds?: number;
    initialFormat?: VideoFormat;
    isDirectMedia?: boolean;
    hasVideoFill?: boolean;
  };
  onExport: (options: VideoExportOptions) => void;
  isExporting: boolean;
}

const FORMATS: ReadonlyArray<{ id: VideoFormat; label: string; icon: typeof Film }> = [
  { id: 'MP4', label: 'MP4', icon: Film },
  { id: 'GIF', label: 'GIF', icon: ImageIcon },
];

export const VideoExport: React.FC<VideoExportProps> = ({ video, onExport, isExporting }) => {
  const isAvailable = Boolean(video);
  const [format, setFormat] = useState<VideoFormat>(video?.initialFormat ?? 'MP4');
  const [fps, setFps] = useState(DEFAULT_FPS[video?.initialFormat ?? 'MP4']);
  const [quality, setQuality] = useState<VideoQuality>('HIGH');
  const [loopCount, setLoopCount] = useState(0);
  const [scale, setScale] = useState<VideoScale>(1);

  // Auto-switch to GIF format when a GIF layer is detected
  React.useEffect(() => {
    if (video?.initialFormat) {
      setFormat(video.initialFormat);
      setFps(clampFps(video.initialFormat, fps));
    }
  }, [video?.initialFormat, video?.frameId]);

  const selectFormat = (next: VideoFormat) => {
    setFormat(next);
    // fps sets differ per format, so re-snap when switching.
    setFps(clampFps(next, fps));
  };

  const handleExport = () => {
    if (!video) return;
    onExport({ format, fps: clampFps(format, fps), quality, loopCount, scale });
  };
  return (
    <div className="relative p-3 border-b border-surface0 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-overlay1">
          <Film size={12} />
          <span>Animation & Video Export</span>
        </div>
        {!isAvailable && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface0 text-overlay0 border border-surface1">
            Disabled
          </span>
        )}
      </div>

      {!isAvailable && (
        <div className="absolute inset-0 top-8 z-10 flex flex-col items-center justify-center p-3 text-center bg-base/30 cursor-not-allowed">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface0/90 border border-surface1 text-overlay1 text-[10px] font-medium shadow-xs mb-1">
            <Film size={11} className="text-overlay0" />
            <span>Chỉ hỗ trợ Video hoặc GIF</span>
          </div>
          <p className="text-[9px] text-overlay0 max-w-[240px] leading-tight">
            Chọn layer video, ảnh động GIF hoặc frame có animation để mở khóa tính năng xuất file.
          </p>
        </div>
      )}

      <div className={`transition ${!isAvailable ? 'filter blur-[1.5px] opacity-25 pointer-events-none select-none' : ''}`}>
        {video ? (
          <p className="mb-2 text-[9px] leading-tight text-overlay0">
            {video.isDirectMedia ? (
              <>
                Detected {video.initialFormat === 'GIF' ? 'GIF' : 'video'} in{' '}
                <span className="font-mono text-subtext0">{video.frameName}</span>
                <span className="text-overlay1"> — direct asset export</span>
              </>
            ) : (
              <>
                Detected motion in{' '}
                <span className="font-mono text-subtext0">{video.frameName}</span>
                {video.durationSeconds !== undefined && (
                  <span className="text-overlay1"> · {video.durationSeconds}s</span>
                )}
                <span className="text-overlay1"> — the whole frame is encoded, not the layer</span>
              </>
            )}
          </p>
        ) : (
          <p className="mb-2 text-[9px] leading-tight text-overlay0">
            No video, GIF, or motion animation detected in selection.
          </p>
        )}

        {/* A plugin cannot read a video's bytes: `VideoPaint` exposes only a hash, and Figma
            ships no reader for it, so the original file is reachable only through Figma's own
            UI. Pointing at that path is the honest alternative to an export that cannot exist. */}
        {video?.hasVideoFill && !video.isDirectMedia && (
          <p className="mb-2 rounded border border-surface1 bg-surface0/60 px-1.5 py-1 text-[9px] leading-tight text-overlay1">
            <span className="font-medium text-subtext0">Need the original file?</span> Figma
            keeps a plugin locked out of video data. Switch to Dev Mode (Shift + D) and use{' '}
            <span className="font-medium text-subtext0">Assets → Download</span> on this layer.
          </p>
        )}
      <div className={`flex items-center gap-1 mb-2 ${!isAvailable ? 'pointer-events-none' : ''}`}>
        <div className="flex rounded bg-surface0 p-0.5 text-[11px] font-medium">
          {FORMATS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => selectFormat(id)}
              disabled={!isAvailable}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
                format === id
                  ? 'bg-surface2 text-blue font-semibold shadow-xs'
                  : 'text-overlay1 hover:text-text'
              } disabled:cursor-not-allowed`}
            >
              <Icon size={10} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={`grid grid-cols-3 gap-1.5 mb-2 text-[10px] ${!isAvailable ? 'pointer-events-none' : ''}`}>
        <label className="flex flex-col gap-0.5">
          <span className="text-overlay0">fps</span>
          <select
            value={fps}
            disabled={!isAvailable}
            onChange={(e) => setFps(Number(e.target.value))}
            className="rounded bg-surface0 px-1 py-0.5 text-subtext1 outline-none disabled:cursor-not-allowed"
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
              disabled={!isAvailable}
              onChange={(e) => setQuality(e.target.value as VideoQuality)}
              className="rounded bg-surface0 px-1 py-0.5 text-subtext1 outline-none disabled:cursor-not-allowed"
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
              disabled={!isAvailable}
              onChange={(e) => setLoopCount(Number(e.target.value))}
              className="rounded bg-surface0 px-1 py-0.5 text-subtext1 outline-none disabled:cursor-not-allowed"
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
            disabled={!isAvailable}
            onChange={(e) => setScale(Number(e.target.value) as VideoScale)}
            className="rounded bg-surface0 px-1 py-0.5 text-subtext1 outline-none disabled:cursor-not-allowed"
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
        disabled={!isAvailable || isExporting}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-surface1 bg-surface0 hover:bg-surface1/60 text-subtext1 hover:border-surface2 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none group"
      >
        {isExporting ? (
          <Loader2 size={13} className="animate-spin text-overlay1" />
        ) : (
          <Film size={13} className={`text-mauve ${isAvailable ? 'group-hover:scale-110' : ''} transition`} />
        )}
        <span className="text-[10px] font-medium">
          {isExporting ? 'Encoding…' : `Download ${format}`}
        </span>
      </button>
      </div>
    </div>
  );
};
