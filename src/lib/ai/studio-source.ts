/**
 * Studio 소스 자료 조립
 *
 * 클립 본문을 프롬프트에 넣을 때 per-clip 상한과 전체 예산을 동시에 지킨다.
 * 예산을 넘으면 "긴 것부터" 깎는다 (water-filling) — 짧은 클립은 온전히 살아남는다.
 */

export const PER_CLIP_CHAR_CAP = 4000;
export const TOTAL_SOURCE_BUDGET = 60000;

export interface SourceClip {
  title: string | null;
  url: string;
  platform: string | null;
  summary: string | null;
  createdAt: string | null;
  content: string | null;
}

/**
 * 전체 합이 budget 이하가 되는 최대 per-item 상한을 구한다.
 * 짧은 항목은 그대로 두고 긴 항목만 같은 높이로 깎는 방식.
 */
export function capForBudget(lengths: number[], budget: number): number {
  if (lengths.length === 0) return 0;
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total <= budget) return Math.max(...lengths);

  const sorted = [...lengths].sort((a, b) => a - b);
  let remaining = budget;
  for (let i = 0; i < sorted.length; i++) {
    const share = Math.floor(remaining / (sorted.length - i));
    if (sorted[i] <= share) {
      remaining -= sorted[i];
      continue;
    }
    return share;
  }
  return Math.max(...lengths);
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 프롬프트에 주입할 소스 자료 블록 */
export function buildSourceMaterial(
  clips: SourceClip[],
  opts: { perClipCap?: number; totalBudget?: number } = {}
): string {
  const perClipCap = opts.perClipCap ?? PER_CLIP_CHAR_CAP;
  const totalBudget = opts.totalBudget ?? TOTAL_SOURCE_BUDGET;

  const bodies = clips.map((clip) => (clip.content ?? '').slice(0, perClipCap));
  const cap = capForBudget(bodies.map((b) => b.length), totalBudget);

  return clips
    .map((clip, idx) => {
      const title = clip.title ?? clip.url;
      const meta = [
        clip.platform ? `플랫폼: ${clip.platform}` : null,
        formatDate(clip.createdAt) ? `저장일: ${formatDate(clip.createdAt)}` : null,
        `URL: ${clip.url}`,
      ]
        .filter((v): v is string => v !== null)
        .join(' · ');

      const trimmed = bodies[idx].slice(0, cap);
      const truncated = trimmed.length < (clip.content ?? '').length;
      const bodyText = trimmed
        ? `\n내용:\n${trimmed}${truncated ? '\n…(이하 생략)' : ''}`
        : clip.summary
          ? `\n요약: ${clip.summary}`
          : '';

      return `[소스 ${idx + 1}] ${title}\n${meta}${bodyText}`;
    })
    .join('\n\n---\n\n');
}

/** 결과물 말미에 붙일 출처 섹션 */
export function buildSourcesSection(clips: SourceClip[]): string {
  if (clips.length === 0) return '';
  const lines = clips.map((clip) => {
    // 제목 안의 대괄호는 마크다운 링크 문법을 깨뜨리므로 소괄호로 치환
    const title = (clip.title ?? clip.url)
      .replace(/\s+/g, ' ')
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .trim();
    return `- [${title}](${clip.url})`;
  });
  return `\n\n---\n\n## 참고한 클립\n\n${lines.join('\n')}\n`;
}
