import React from 'react';
import { Link2, Copy, Check, AlertCircle } from 'lucide-react';
import { buildNodeUrl, toNodeIdParam } from '../../utils/node-link';

interface NodeLinkProps {
  nodeId: string;
  fileKey?: string;
  fileName: string;
  onCopy: (value: string, label: string) => void;
  copiedText: string | null;
}

export const NodeLink: React.FC<NodeLinkProps> = ({
  nodeId,
  fileKey,
  fileName,
  onCopy,
  copiedText,
}) => {
  const url = buildNodeUrl(fileKey, fileName, nodeId);
  // Without a link the useful thing is the id in its URL form, so it can be pasted into a
  // `?node-id=` parameter. That is NOT the same as the API form (`1:2`), so it is labelled
  // as the URL form rather than as "the node ID".
  const value = url ?? toNodeIdParam(nodeId);
  const isCopied = copiedText === value;

  return (
    <div className="px-3 py-1.5 border-b border-surface0 bg-base">
      <button
        onClick={() => onCopy(value, url ? 'Node link' : 'URL node ID')}
        className="group w-full flex items-center gap-1.5 px-2 py-1 rounded bg-surface0 hover:bg-surface1 text-subtext1 transition"
        title={
          url
            ? `Copy link to this layer: ${url}`
            : `Copy this layer’s node ID in URL form (${value}). API calls need ${nodeId}.`
        }
      >
        {url ? (
          <Link2 size={11} className="text-blue shrink-0" />
        ) : (
          <AlertCircle size={11} className="text-peach shrink-0" />
        )}

        <span className="flex-1 min-w-0 truncate font-mono text-[10px] text-left">{value}</span>

        {isCopied ? (
          <Check size={11} className="text-green shrink-0" />
        ) : (
          <Copy size={11} className="opacity-40 group-hover:opacity-100 shrink-0" />
        )}
      </button>

      {!url && (
        <p className="mt-1 text-[9px] leading-tight text-overlay0">
          Full link unavailable — the file is unsaved, or the plugin lacks private-plugin
          access. Copied the URL form of the node ID; API calls need{' '}
          <span className="font-mono">{nodeId}</span>.
        </p>
      )}
    </div>
  );
};
