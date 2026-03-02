/**
 * Client-side import helper.
 * Sends a file to the import endpoint and returns the import result.
 */

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

export async function importClips(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/v1/clips/import', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(json?.error?.message ?? 'Import failed');
  }

  const json = (await response.json()) as { success: boolean; data: ImportResult };
  return json.data;
}
