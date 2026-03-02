/**
 * Client-side export helper.
 * Fetches the export endpoint and triggers a browser download.
 */

export async function exportClips(format: 'json' | 'csv' = 'json'): Promise<void> {
  const response = await fetch(`/api/v1/clips/export?format=${format}`);
  if (!response.ok) throw new Error('Export failed');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `linkbrain-clips-${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
