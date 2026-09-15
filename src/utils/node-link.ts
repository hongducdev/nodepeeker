/**
 * Deep links into a Figma file.
 *
 * `figma.fileKey` is only populated when the manifest sets `enablePrivatePluginApi: true`
 * AND the plugin is private/local. A publicly published plugin never receives a key, so
 * every consumer must handle `null`.
 */

/** Figma addresses nodes with dashes in URLs: `1:2` becomes `1-2`. */
export function toNodeIdParam(nodeId: string): string {
  return nodeId.replace(/:/g, '-');
}

/**
 * The name segment is cosmetic -- Figma resolves by `fileKey` and rewrites the path -- but
 * it is included so the copied link reads the same way Figma's own "Copy link" does.
 * Leading/trailing separators are removed by the strip below, so no separate trim is needed.
 */
function toFileSlug(fileName: string): string {
  const slug = fileName
    .replace(/[\s/\\?#]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return encodeURIComponent(slug);
}

export function buildNodeUrl(
  fileKey: string | undefined,
  fileName: string,
  nodeId: string
): string | null {
  if (!fileKey) return null;
  const slug = toFileSlug(fileName);
  const path = slug ? `${fileKey}/${slug}` : fileKey;
  return `https://www.figma.com/design/${path}?node-id=${toNodeIdParam(nodeId)}`;
}
