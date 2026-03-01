/**
 * Naver Blog Text Normalizer
 *
 * Cleans Naver Blog content specifically:
 * - Removes navigation and UI elements
 * - Cleans up special characters and arrows
 * - Preserves main blog post content
 * - Extracts clean text from mobile version
 */

function cleanSpecialChars(text: string): string {
    let t = text;
    t = t.replace(/^[>\-•▶►▷→◆◇■□●○★☆]+\s*/gm, '');
    t = t.replace(/[>\-▶►▷→]+\s*$/gm, '');
    t = t.replace(/\*{2,}/g, '');
    t = t.replace(/^[#*>\-─│┃]+$/gm, '');
    t = t.replace(/[ \t]{3,}/g, '  ');
    return t;
}

function removeNaverNoise(text: string): string {
    let t = text;

    const noisePatterns = [
        /이웃추가/g,
        /공감\s*\d*/g,
        /댓글\s*\d*/g,
        /구독하기/g,
        /블로그 홈/g,
        /블로그로 돌아가기/g,
        /프로필/g,
        /포스트 목록/g,
        /이전 포스트/g,
        /다음 포스트/g,
        /블로그 메뉴/g,
        /공지사항/g,
        /최근 포스트/g,
        /내 블로그/g,
        /글쓰기/g,
        /통계/g,
        /관리/g,
        /로그인/g,
        /네이버 블로그/g,
        /N Pay/g,
        /스마트스토어/g,
        /NAVER/gi,
        /https?:\/\/[^\s]+/g, // Remove URLs
        /맨\s*위로/g,
        /TOP/g,
        /첨부파일/g,
        /좋아요\s*\d*/g,
    ];

    for (const pattern of noisePatterns) {
        t = t.replace(pattern, '');
    }

    return t;
}

function extractNaverContent(text: string): string {
    const lines = text.split('\n');
    const contentLines: string[] = [];
    let foundContent = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (!foundContent && !trimmed) continue;
        if (trimmed.length < 3 && trimmed.length > 0) continue;
        if (/^\d+$/.test(trimmed)) continue;
        if (/^(이전|다음|목록|홈|검색|메뉴)\s*$/.test(trimmed)) continue;

        if (trimmed.length > 15) {
            foundContent = true;
        }

        if (foundContent && trimmed.length > 0) {
            contentLines.push(trimmed);
        }
    }

    return contentLines.join('\n');
}

/**
 * Main normalizer for Naver Blog content
 */
export function normalizeNaverBlog(raw: string): string {
    if (!raw) return '';

    let text = raw;

    // Step 1: Remove image markdown
    text = text.replace(/!\[[\s\S]*?\]\([\s\S]*?\)/g, '');
    text = text.replace(/\[\[?Image\s*\d*:?[^\]]*\]\]?/gi, '');

    // Step 2: Clean markdown links - keep label
    text = text.replace(/\[([^\]]*?)\]\((https?:\/\/[^)]*?)\)/g, '$1');

    // Step 3: Clean special characters
    text = cleanSpecialChars(text);

    // Step 4: Remove Naver-specific noise
    text = removeNaverNoise(text);

    // Step 5: Extract main content
    text = extractNaverContent(text);

    // Step 6: Format paragraphs
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        const isNewSection = /^[가-힣A-Za-z]/.test(trimmed) && trimmed.length > 30;

        if (isNewSection && currentParagraph.length > 0) {
            paragraphs.push(currentParagraph.join(' '));
            currentParagraph = [];
        }

        currentParagraph.push(trimmed);
    }

    if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '));
    }

    const filtered = paragraphs.filter(p => p.length > 15);

    return filtered.join('\n\n');
}

export default normalizeNaverBlog;
