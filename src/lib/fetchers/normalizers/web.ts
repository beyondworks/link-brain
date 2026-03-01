/**
 * Web Text Normalizer
 *
 * Cleans and structures general web content:
 * - Removes navigation menus, sidebars, footers
 * - Removes image markdown
 * - Cleans markdown links (keeps label, removes URL)
 * - Removes garbage tokens and JSON blocks
 * - Focuses on article/main content
 */

// Navigation/menu keywords to detect and remove
const NAV_KEYWORDS = [
    '뉴스홈', '뉴스스탠드', '홈', '메뉴', '검색', '로그인', '회원가입',
    '구독', '알림', '설정', '프리미엄', '마이페이지', '고객센터',
    '광고문의', '이용약관', '개인정보', '저작권', '뉴스제보',
    'HOME', 'MENU', 'LOGIN', 'SUBSCRIBE', 'SEARCH', 'SETTINGS',
    '전체기사', '최신기사', '인기기사', '포토', '영상', '연예', '스포츠',
    '경제', '정치', '사회', '국제', '문화', '생활', 'IT', '과학',
    '오피니언', '인터뷰', '칼럼', '사설', '기획', '특집'
];

// Footer patterns
const FOOTER_PATTERNS = [
    /copyright/i,
    /©\s*\d{4}/,
    /all\s*rights\s*reserved/i,
    /무단\s*전재/,
    /재배포\s*금지/,
    /저작권\s*보호/,
    /문의\s*메일/,
    /대표\s*전화/,
    /사업자\s*등록/
];

// Category list patterns (news sites often have these)
const CATEGORY_PATTERN = /^[\*\-•]\s*(.{1,20})$/;

function isNavOrCategory(line: string): boolean {
    const trimmed = line.trim();
    if (trimmed.length < 30 && NAV_KEYWORDS.some(kw => trimmed.includes(kw))) {
        return true;
    }
    if (CATEGORY_PATTERN.test(trimmed) && trimmed.length < 25) {
        return true;
    }
    return false;
}

function isFooterContent(line: string): boolean {
    return FOOTER_PATTERNS.some(pattern => pattern.test(line));
}

function removeImageMarkdown(text: string): string {
    let t = text.replace(/!\[[\s\S]*?\]\([\s\S]*?\)/g, '');
    t = t.replace(/\[\[?Image\s*\d*:?[^\]]*\]\]?/gi, '');
    return t;
}

function cleanMarkdownLinks(text: string): string {
    return text.replace(/\[([^\]]*?)\]\((https?:\/\/[^)]*?)\)/g, (_match, label) => {
        const cleanLabel = (label || '').trim();
        if (!cleanLabel) return '';
        if (/^링크$/i.test(cleanLabel)) return '';
        if (/^link$/i.test(cleanLabel)) return '';
        if (/^Log in$/i.test(cleanLabel)) return '';
        if (/^로그인$/i.test(cleanLabel)) return '';
        if (/^Read more$/i.test(cleanLabel)) return '';
        if (/^Learn more$/i.test(cleanLabel)) return '';
        if (/^Click here$/i.test(cleanLabel)) return '';
        if (/^더보기$/i.test(cleanLabel)) return '';
        if (/^자세히$/i.test(cleanLabel)) return '';
        return cleanLabel;
    });
}

function cleanMarkdownFormatting(text: string): string {
    let t = text;

    t = t.replace(/```[\s\S]*?```/g, '');
    t = t.replace(/`([^`]+)`/g, '$1');
    t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
    t = t.replace(/__([^_]+)__/g, '$1');
    t = t.replace(/(?<!^)(?<!\n)\*([^*\n]+)\*/g, '$1');
    t = t.replace(/(?<!^)(?<!\n)_([^_\n]+)_/g, '$1');
    t = t.replace(/~~([^~]+)~~/g, '$1');
    t = t.replace(/^#{1,6}\s+(.+)$/gm, '$1');
    t = t.replace(/^>\s*/gm, '');
    t = t.replace(/^[*\-]\s+/gm, '');
    t = t.replace(/^\d+\.\s+/gm, '');
    t = t.replace(/^[-*_]{3,}$/gm, '');
    t = t.replace(/^\|?[-:]+\|[-:|\s]+$/gm, '');
    t = t.replace(/\|/g, ' ');
    t = t.replace(/&nbsp;/g, ' ');
    t = t.replace(/&amp;/g, '&');
    t = t.replace(/&lt;/g, '<');
    t = t.replace(/&gt;/g, '>');
    t = t.replace(/&quot;/g, '"');
    t = t.replace(/\[([^\]]+)\]/g, '$1');

    return t;
}

function removeGarbageTokens(text: string): string {
    let t = text;
    t = t.replace(/\[\s*\]/g, '');
    t = t.replace(/\(\s*\)/g, '');
    t = t.replace(/\[링크\]/gi, '');
    t = t.replace(/^https?:\/\/\S+$/gm, '');
    t = t.replace(/[\w.-]+@[\w.-]+\.\w+/g, '');
    t = t.replace(/\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '');
    return t;
}

function removeJsonBlocks(text: string): string {
    const paragraphs = text
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean);

    const cleaned: string[] = [];

    for (const p of paragraphs) {
        if (p.includes('"style_mode"')) continue;
        if (p.includes('"negative_prompt"')) continue;

        const isJsonLike = p.length > 200 &&
            p.includes('{') &&
            p.includes('":') &&
            (p.match(/"/g) || []).length > 10;
        if (isJsonLike) continue;

        cleaned.push(p);
    }

    return cleaned.join('\n\n');
}

function removeNavigationSections(text: string): string {
    const lines = text.split('\n');
    const filtered: string[] = [];
    let consecutiveNavCount = 0;
    let skipUntilContent = false;
    let footerReached = false;  // BUG FIX B4: once footer detected, never reset

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            if (!skipUntilContent) filtered.push(line);
            continue;
        }

        if (isNavOrCategory(trimmed)) {
            consecutiveNavCount++;
            if (consecutiveNavCount >= 3) {
                skipUntilContent = true;
            }
            continue;
        }

        if (isFooterContent(trimmed)) {
            skipUntilContent = true;
            footerReached = true;
            continue;
        }

        if (trimmed.length > 50 && !footerReached) {
            consecutiveNavCount = 0;
            skipUntilContent = false;
        }

        if (!skipUntilContent) {
            filtered.push(line);
        }
    }

    return filtered.join('\n');
}

function extractMainContent(text: string): string {
    const paragraphs = text
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

    if (paragraphs.length === 0) return '';

    const totalInputLength = paragraphs.reduce((sum, p) => sum + p.length, 0);
    const contentParagraphs: string[] = [];
    let contentStarted = false;

    for (const p of paragraphs) {
        if (!contentStarted && p.length < 10) {
            continue;
        }

        if (!contentStarted && p.length >= 20) {
            contentStarted = true;
        }

        if (!contentStarted && p.length >= 10) {
            contentParagraphs.push(p);
            if (contentParagraphs.length >= 2) {
                contentStarted = true;
            }
            continue;
        }

        if (contentStarted) {
            if (isFooterContent(p)) break;
            if (p.length >= 15) {
                contentParagraphs.push(p);
            }
        }
    }

    const extractedText = contentParagraphs.join('\n\n');
    const extractedLength = extractedText.length;

    if (totalInputLength > 100 && extractedLength < totalInputLength * 0.3) {
        const allContent = paragraphs
            .filter(p => p.length >= 15 && !isFooterContent(p))
            .join('\n\n');
        return allContent;
    }

    return extractedText;
}

/**
 * Main normalizer for web content
 */
export function normalizeWeb(raw: string): string {
    if (!raw) return '';

    let text = raw;

    text = removeImageMarkdown(text);
    text = cleanMarkdownLinks(text);
    text = cleanMarkdownFormatting(text);
    text = removeGarbageTokens(text);
    text = removeJsonBlocks(text);
    text = removeNavigationSections(text);
    text = extractMainContent(text);

    const paragraphs = text
        .replace(/\r\n/g, '\n')
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

    const filtered = paragraphs.filter(p => {
        if (p.length < 10) return false;
        if (/^\d+$/.test(p)) return false;
        if (/^[!?.,]+$/.test(p)) return false;
        if (/^\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(p) && p.length < 20) return false;
        return true;
    });

    return filtered.join('\n\n');
}

export const cleanGenericMarkdown = normalizeWeb;

export default normalizeWeb;
