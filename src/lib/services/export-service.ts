// Export service for Linkbrain v2
// Ported from v1 src/lib/exportService.ts
// Converts clip data to CSV, Markdown (incl. Obsidian-compatible), HTML, and JSON.

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface ExportableClip {
  id: string;
  title: string;
  url: string;
  category?: string;
  tags?: string[];
  savedAt: string;      // ISO date string
  summary?: string;
  notes?: string;
  collectionIds?: string[];
}

export interface ExportableCollection {
  id: string;
  name: string;
  clipCount: number;
}

export interface ExportData {
  clips: ExportableClip[];
  collections?: ExportableCollection[];
  exportedAt: string;
  totalClips: number;
}

// ─── CSV ───────────────────────────────────────────────────────────────────────

/**
 * Convert clips to CSV (Excel / Google Sheets compatible).
 */
export const exportToCSV = (clips: ExportableClip[]): string => {
  const headers = ['제목', 'URL', '카테고리', '태그', '저장일', '요약', '메모'];
  const headerRow = headers.join(',');

  const escapeCsv = (str: string | undefined): string => {
    if (!str) return '';
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = clips.map((clip) =>
    [
      escapeCsv(clip.title),
      escapeCsv(clip.url),
      escapeCsv(clip.category),
      escapeCsv(clip.tags?.join(', ')),
      escapeCsv(clip.savedAt),
      escapeCsv(clip.summary),
      escapeCsv(clip.notes),
    ].join(',')
  );

  return [headerRow, ...rows].join('\n');
};

// ─── Markdown ──────────────────────────────────────────────────────────────────

/**
 * Convert clips to Markdown, grouped by category.
 */
export const exportToMarkdown = (
  clips: ExportableClip[],
  title = 'LinkBrain Export'
): string => {
  const now = new Date().toLocaleDateString('ko-KR');
  let md = `# ${title}\n\n`;
  md += `> Exported on ${now}\n\n---\n\n`;

  const byCategory = clips.reduce<Record<string, ExportableClip[]>>((acc, clip) => {
    const cat = clip.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(clip);
    return acc;
  }, {});

  for (const [category, categoryClips] of Object.entries(byCategory)) {
    md += `## ${category}\n\n`;

    for (const clip of categoryClips) {
      md += `### [${clip.title}](${clip.url})\n\n`;
      md += `- **저장일**: ${clip.savedAt}\n`;

      if (clip.tags && clip.tags.length > 0) {
        md += `- **태그**: ${clip.tags.map((t) => `#${t}`).join(' ')}\n`;
      }

      if (clip.summary) {
        md += `\n> ${clip.summary}\n`;
      }

      if (clip.notes) {
        md += `\n**메모**: ${clip.notes}\n`;
      }

      md += '\n---\n\n';
    }
  }

  return md;
};

// ─── Obsidian-compatible Markdown ─────────────────────────────────────────────

/**
 * Convert clips to Obsidian-compatible Markdown with YAML frontmatter.
 * Each clip becomes a separate note block; the export is a single file
 * that can be split if needed.
 */
export const exportToObsidianMarkdown = (clips: ExportableClip[]): string => {
  const now = new Date().toISOString();
  const notes = clips.map((clip) => {
    const tags = (clip.tags ?? []).map((t) => `  - ${t}`).join('\n');
    const frontmatter = [
      '---',
      `title: "${clip.title.replace(/"/g, "'")}"`,
      `url: ${clip.url}`,
      `category: ${clip.category ?? 'Uncategorized'}`,
      clip.tags && clip.tags.length ? `tags:\n${tags}` : 'tags: []',
      `saved: ${clip.savedAt}`,
      `exported: ${now}`,
      '---',
    ].join('\n');

    let body = `# ${clip.title}\n\n`;
    body += `**Source**: [${clip.url}](${clip.url})\n\n`;
    if (clip.summary) body += `## Summary\n\n${clip.summary}\n\n`;
    if (clip.notes) body += `## Notes\n\n${clip.notes}\n\n`;

    return `${frontmatter}\n\n${body}`;
  });

  return notes.join('\n\n---\n\n');
};

// ─── HTML ──────────────────────────────────────────────────────────────────────

/**
 * Convert clips to a standalone HTML document.
 */
export const exportToHTML = (
  clips: ExportableClip[],
  title = 'LinkBrain Export'
): string => {
  const now = new Date().toLocaleDateString('ko-KR');

  const byCategory = clips.reduce<Record<string, ExportableClip[]>>((acc, clip) => {
    const cat = clip.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(clip);
    return acc;
  }, {});

  const categorySections = Object.entries(byCategory)
    .map(([category, categoryClips]) => {
      const clipItems = categoryClips
        .map((clip) => {
          const tagsHtml =
            clip.tags && clip.tags.length
              ? `<p class="tags">${clip.tags.map((t) => `<span class="tag">#${t}</span>`).join(' ')}</p>`
              : '';
          const summaryHtml = clip.summary
            ? `<blockquote>${clip.summary}</blockquote>`
            : '';
          const notesHtml = clip.notes
            ? `<p><strong>메모:</strong> ${clip.notes}</p>`
            : '';

          return `
          <div class="clip">
            <h3><a href="${clip.url}" target="_blank">${clip.title}</a></h3>
            <p class="date">저장일: ${clip.savedAt}</p>
            ${tagsHtml}
            ${summaryHtml}
            ${notesHtml}
          </div>`;
        })
        .join('\n');

      return `
      <section>
        <h2>${category}</h2>
        ${clipItems}
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
    h1 { font-size: 2rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; color: #374151; margin-top: 2rem; }
    h3 a { color: #2563eb; text-decoration: none; }
    h3 a:hover { text-decoration: underline; }
    .clip { margin: 1.5rem 0; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; }
    .date { color: #6b7280; font-size: 0.875rem; }
    .tags .tag { background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; margin-right: 4px; }
    blockquote { border-left: 3px solid #d1d5db; margin: 0.75rem 0; padding-left: 1rem; color: #4b5563; font-style: italic; }
    .meta { color: #9ca3af; font-size: 0.8rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Exported on ${now} &mdash; ${clips.length} clips total</p>
  ${categorySections}
</body>
</html>`;
};

// ─── JSON ──────────────────────────────────────────────────────────────────────

/**
 * Convert export data to formatted JSON string.
 */
export const exportToJSON = (data: ExportData): string =>
  JSON.stringify(data, null, 2);

// ─── Browser download helper ───────────────────────────────────────────────────

/**
 * Trigger a file download in the browser.
 * Only valid in browser environments (not during SSR).
 */
export const downloadFile = (content: string, filename: string, type: string): void => {
  if (typeof window === 'undefined') {
    console.warn('[ExportService] downloadFile called in non-browser context');
    return;
  }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Convenience: perform export ──────────────────────────────────────────────

export type ExportFormat = 'csv' | 'markdown' | 'obsidian' | 'html' | 'json';

/**
 * Execute a complete export: build content and trigger download.
 */
export const performExport = (
  clips: ExportableClip[],
  format: ExportFormat,
  collections?: ExportableCollection[]
): void => {
  const timestamp = new Date().toISOString().split('T')[0];

  switch (format) {
    case 'csv': {
      const content = exportToCSV(clips);
      downloadFile(content, `linkbrain-export-${timestamp}.csv`, 'text/csv;charset=utf-8;');
      break;
    }
    case 'markdown': {
      const content = exportToMarkdown(clips);
      downloadFile(content, `linkbrain-export-${timestamp}.md`, 'text/markdown;charset=utf-8;');
      break;
    }
    case 'obsidian': {
      const content = exportToObsidianMarkdown(clips);
      downloadFile(content, `linkbrain-obsidian-${timestamp}.md`, 'text/markdown;charset=utf-8;');
      break;
    }
    case 'html': {
      const content = exportToHTML(clips);
      downloadFile(content, `linkbrain-export-${timestamp}.html`, 'text/html;charset=utf-8;');
      break;
    }
    case 'json': {
      const data: ExportData = {
        clips,
        collections,
        exportedAt: new Date().toISOString(),
        totalClips: clips.length,
      };
      const content = exportToJSON(data);
      downloadFile(content, `linkbrain-export-${timestamp}.json`, 'application/json;charset=utf-8;');
      break;
    }
  }
};
