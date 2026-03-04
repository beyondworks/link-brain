'use client';

import { useMemo } from 'react';

/* ─── Block types ────────────────────────────────────────────────────── */

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'p'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; lang: string; lines: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[] }
  | { type: 'hr' };

/* ─── Parser ─────────────────────────────────────────────────────────── */

export function parseMarkdown(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang, lines: codeLines });
      i++;
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1]?.includes('---')) {
      const headers = line.split('|').map((c) => c.trim()).filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map((c) => c.trim()).filter(Boolean));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      blocks.push({ type: 'h4', text: line.slice(5) });
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3) });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    // List items
    if (line.startsWith('- ') || /^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || /^\d+\.\s/.test(lines[i]))) {
        items.push(lines[i].replace(/^[-\d.]+\s/, ''));
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Paragraph
    if (line.trim()) {
      blocks.push({ type: 'p', text: line });
    }
    i++;
  }

  return blocks;
}

/* ─── Inline renderers ───────────────────────────────────────────────── */

function boldItalic(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

/** Render markdown links, bare URLs, @mentions, and #hashtags */
function renderLinks(text: string): React.ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)<>\]]+|@[a-zA-Z0-9_.]+|#[a-zA-Z0-9가-힣_]+)/g);
  return parts.map((part, i) => {
    // Markdown link
    const mdLink = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (mdLink) {
      return (
        <a
          key={i}
          href={mdLink[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          {boldItalic(mdLink[1])}
        </a>
      );
    }
    // Bare URL
    if (/^https?:\/\//.test(part)) {
      const display = part.length > 60 ? `${part.slice(0, 57)}...` : part;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary break-all underline-offset-2 hover:underline"
        >
          {display}
        </a>
      );
    }
    // @mention
    if (/^@[a-zA-Z0-9_.]+$/.test(part)) {
      return (
        <span key={i} className="font-semibold text-primary/80">{part}</span>
      );
    }
    // #hashtag
    if (/^#[a-zA-Z0-9가-힣_]+$/.test(part)) {
      return (
        <span key={i} className="font-medium text-primary/70">{part}</span>
      );
    }
    return <span key={i}>{boldItalic(part)}</span>;
  });
}

function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? (
          <code key={i} className="rounded bg-muted/80 px-1.5 py-0.5 text-[13px] font-mono text-primary">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{renderLinks(part)}</span>
        )
      )}
    </>
  );
}

/* ─── Block renderer ─────────────────────────────────────────────────── */

function MarkdownBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'h2':
      return (
        <div className="flex items-center gap-3 pt-2">
          <h2 className="text-gradient-brand text-[11px] font-bold uppercase tracking-[0.14em]">
            {block.text}
          </h2>
          <div className="divider-gradient flex-1" />
        </div>
      );
    case 'h3':
      return <h3 className="pt-1 text-base font-bold text-foreground">{block.text}</h3>;
    case 'h4':
      return <h4 className="text-sm font-semibold text-foreground/90">{block.text}</h4>;
    case 'p':
      return (
        <p className="text-sm leading-relaxed text-foreground/80">
          <InlineCode text={block.text} />
        </p>
      );
    case 'blockquote':
      return (
        <blockquote className="border-l-2 border-primary/40 bg-primary/5 py-2 pl-4 pr-3 rounded-r-lg">
          <p className="text-sm italic leading-relaxed text-foreground/70">
            <InlineCode text={block.text} />
          </p>
        </blockquote>
      );
    case 'code':
      return (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-gray-950">
          {block.lang && (
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
              <span className="text-[11px] font-medium text-white/50">{block.lang}</span>
            </div>
          )}
          <pre className="overflow-x-auto p-4">
            <code className="text-[13px] leading-relaxed text-green-300/90 font-mono">
              {block.lines.join('\n')}
            </code>
          </pre>
        </div>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-foreground/70">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/30 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-xs text-foreground/70">
                      <InlineCode text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'list':
      return (
        <ul className="space-y-1.5 pl-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground/80">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <InlineCode text={item} />
            </li>
          ))}
        </ul>
      );
    case 'hr':
      return <div className="my-2 h-px bg-border/50" />;
  }
}

/* ─── Main component ─────────────────────────────────────────────────── */

export function MarkdownContent({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="prose-custom space-y-4">
      {blocks.map((block, i) => (
        <MarkdownBlock key={i} block={block} />
      ))}
    </div>
  );
}
