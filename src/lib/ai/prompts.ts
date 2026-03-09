// AI prompt templates for Linkbrain v2
// Centralises all prompt strings used across clip-service and ai/service

// ─── Clip metadata extraction ──────────────────────────────────────────────────

export const buildClipMetadataPrompt = (params: {
  url: string;
  platform: string;
  rawText: string;
  language: string; // 'KR' | 'EN'
}): { system: string; user: string; maxTokens: number } => {
  const { url, platform, rawText, language } = params;
  const langName = language === 'KR' ? 'Korean' : 'English';
  const isYouTube =
    platform === 'youtube' ||
    url.includes('youtube.com') ||
    url.includes('youtu.be');
  const contentLength = rawText.length;
  const contentSlice = rawText.substring(0, 8000);

  if (isYouTube) {
    return {
      system:
        'You are an expert video content analyzer. You summarize video content based on transcripts and descriptions to help users understand the video without watching it.',
      user: `You are an expert video content summarizer. Analyze this YouTube video's metadata and transcript to create a comprehensive summary.

URL: ${url}

VIDEO CONTENT:
"""
${contentSlice}
"""

INSTRUCTIONS:
- Write a detailed summary of what the video is ABOUT and what key points are covered
- If transcript is available, summarize the ACTUAL SPOKEN CONTENT, not just the title
- Include specific topics, insights, tips, or arguments presented in the video
- The summary should be informative enough that someone can understand the video's value without watching it
- Write 3-5 sentences that capture the essence of the video content
- Use ${langName} language

Generate JSON:
{
  "title": "Clear, descriptive title in ${langName} (max 60 chars)",
  "summary": "Concise 3-5 sentence summary of the video content in ${langName}. Cover main topics and key takeaways.",
  "detailedSummary": "Create a timestamped chapter summary of the video in ${langName}. Use timestamps from the transcript to identify major topic transitions. For each chapter, write '[MM:SS] Chapter Title — 2-3 sentence summary of what is discussed.' Cover all major sections chronologically. Aim for 5-10 chapters depending on video length. Example format:\n[0:00] Introduction — The creator introduces today's topic...\n[3:20] First Key Point — Explains the concept of...\nThis should be informative enough that someone can understand the video's full content without watching it.",
  "keywords": ["5-7 specific keywords in ${langName}"],
  "category": "Choose from: Design, Dev, AI, Product, Business, Marketing, Finance, Stock, Investment, Crypto, Health, Fitness, Education, Science, News, Entertainment, Music, Gaming, Travel, Food, Lifestyle, Sports, Fashion, Art, Photography, Automation, Productivity, Career, Startup, Other",
  "sentiment": "positive | neutral | negative",
  "type": "video"
}

Return ONLY valid JSON.`,
      maxTokens: 1200,
    };
  }

  let summaryInstruction: string;
  if (contentLength < 300) {
    summaryInstruction = 'Write 1 sentence summarizing the key point.';
  } else if (contentLength < 1000) {
    summaryInstruction = 'Write 2-3 sentences covering the main idea and key details.';
  } else {
    summaryInstruction =
      'Write 3-5 sentences that cover the main topic, key arguments or points, and any notable conclusions or takeaways.';
  }

  return {
    system:
      'You are a content summarizer that creates informative summaries to help users understand saved articles without reading the full text.',
    user: `You are a content summarizer. Analyze the article content below and create informative metadata.

RULES:
- Base your summary STRICTLY on the CONTENT below — do not invent information
- Write a summary that helps someone decide whether to read the full article
- Include the main topic, key points, and any notable conclusions
- Remove duplicate paragraphs — use each idea only once
- ${summaryInstruction}
- Use ${langName} language

URL: ${url}
Platform: ${platform}

CONTENT:
"""
${contentSlice}
"""

Generate JSON:
{
  "title": "Clear, descriptive title in ${langName} (max 60 chars)",
  "summary": "${summaryInstruction} Write in ${langName}.",
  "keywords": ["5-7 relevant keywords in ${langName}"],
  "category": "Choose the MOST relevant from: Design, Dev, AI, Product, Business, Marketing, Finance, Stock, Investment, Crypto, Health, Fitness, Education, Science, News, Entertainment, Music, Gaming, Travel, Food, Lifestyle, Sports, Fashion, Art, Photography, Automation, Productivity, Career, Startup, Other",
  "sentiment": "positive | neutral | negative",
  "type": "article | video | image | social_post | website"
}

CATEGORY HINTS:
- Stock/Investment/Finance: 주식, 투자, 증권, 배당, ETF, 펀드, 재테크, 경제, stock, invest, dividend, portfolio
- Crypto: 비트코인, 이더리움, 암호화폐, 코인, NFT, 블록체인, crypto, bitcoin, ethereum
- Health/Fitness: 건강, 운동, 헬스, 다이어트, 영양, 의료, health, fitness, workout, nutrition
- Marketing: 마케팅, 광고, 브랜딩, SEO, 콘텐츠, 소셜미디어, marketing, ads, branding
- Business: 사업, 경영, 창업, 스타트업, 비즈니스, 회사, business, startup, entrepreneur
- Automation: 자동화, RPA, 워크플로우, 노코드, Zapier, Make, automation, workflow
- Productivity: 생산성, 효율, 시간관리, 습관, 노션, productivity, efficiency, time management

Return ONLY valid JSON, no markdown or explanations.`,
    maxTokens: contentLength > 1000 ? 600 : 400,
  };
};

export const buildUrlMetadataPrompt = (params: {
  url: string;
  platform: string;
  language: string;
}): { system: string; user: string } => {
  const { url, platform, language } = params;
  const langName = language === 'KR' ? 'Korean' : 'English';

  let urlInfo = '';
  try {
    const parsed = new URL(url);
    urlInfo = `Domain: ${parsed.hostname}\nPath: ${parsed.pathname}`;
    if (parsed.searchParams.toString()) {
      urlInfo += `\nParams: ${parsed.searchParams.toString()}`;
    }
  } catch {
    urlInfo = url;
  }

  return {
    system:
      'You generate brief, factual metadata for saved links when page content is unavailable.',
    user: `You are a metadata generation assistant. Generate metadata for a saved link based on its URL.

URL: ${url}
Platform: ${platform}
URL Info:
${urlInfo}

Since the actual page content could not be extracted, generate a brief, factual metadata entry.
- Title: Generate a descriptive title from the URL structure in ${langName} (max 60 chars)
- Summary: Write a 1 sentence description in ${langName} indicating this is a saved ${platform} link. Mention any identifiable topic from the URL.
- Do NOT hallucinate or invent specific content claims

Generate JSON:
{
  "title": "Descriptive title in ${langName}",
  "summary": "Brief description in ${langName}",
  "keywords": ["3-5 keywords in ${langName}"],
  "category": "Choose from: Design, Dev, AI, Product, Business, Marketing, Finance, Stock, Investment, Crypto, Health, Fitness, Education, Science, News, Entertainment, Music, Gaming, Travel, Food, Lifestyle, Sports, Fashion, Art, Photography, Automation, Productivity, Career, Startup, Other",
  "sentiment": "neutral",
  "type": "article | video | image | social_post | website"
}

Return ONLY valid JSON.`,
  };
};

// ─── Content summary ───────────────────────────────────────────────────────────

export const CONTENT_SUMMARY_PROMPT = (content: string, language: 'ko' | 'en'): string =>
  language === 'ko'
    ? `다음 콘텐츠를 읽고 핵심 내용을 3-5문장으로 요약하세요. 제공된 텍스트 외의 내용은 추가하지 마세요.\n\n콘텐츠:\n${content}`
    : `Read the following content and summarize the key points in 3-5 sentences. Do not add any information not present in the provided text.\n\nContent:\n${content}`;

// ─── Auto-tag suggestions ──────────────────────────────────────────────────────

export const AUTO_TAG_PROMPT = (content: string, existingTags: string[], language: 'ko' | 'en'): string => {
  const tagList = existingTags.length ? existingTags.join(', ') : 'none';
  return language === 'ko'
    ? `다음 콘텐츠를 분석하고 적합한 태그 5개를 제안하세요.

기존 태그 목록: ${tagList}

규칙:
- 기존 태그와 정확히 일치하는 것이 있으면 우선 사용
- 새 태그는 소문자, 하이픈 사용 (예: machine-learning)
- JSON 배열로 반환: ["tag1", "tag2", ...]

콘텐츠:
${content.substring(0, 2000)}`
    : `Analyze the following content and suggest 5 appropriate tags.

Existing tags: ${tagList}

Rules:
- Prefer exact matches from existing tags when appropriate
- New tags should be lowercase with hyphens (e.g., machine-learning)
- Return a JSON array: ["tag1", "tag2", ...]

Content:
${content.substring(0, 2000)}`;
};

// ─── Studio content generation prompts ────────────────────────────────────────

export type StudioContentType =
  | 'report'
  | 'planning'
  | 'trend'
  | 'big-picture'
  | 'step-by-step'
  | 'chapter-lessons'
  | 'simplify'
  | 'key-concepts'
  | 'quiz'
  | 'visual-map'
  | 'review-notes'
  | 'teach-back'
  | 'sns-post'
  | 'newsletter'
  | 'presentation'
  | 'email-draft'
  | 'blog-post'
  | 'executive-summary';

export const buildStudioPrompt = (
  clips: Array<Record<string, unknown>>,
  contentType: StudioContentType,
  language: 'ko' | 'en'
): string => {
  const clipSummaries = clips
    .map((clip, i) => {
      const createdAt = clip.created_at ?? clip.createdAt;
      const date = createdAt
        ? new Date(createdAt as string).toISOString().split('T')[0]
        : 'Unknown';
      const keywords = (
        (clip.ai_tags as string[]) ??
        (clip.keywords as string[]) ??
        []
      ).join(', ');
      const summary = (clip.summary ?? clip.description ?? '') as string;
      const content = ((clip.content ?? '') as string).slice(0, 300);
      return `[${i + 1}] ${clip.title ?? 'Untitled'}
   - Date: ${date}
   - Keywords: ${keywords || 'None'}
   - Summary: ${summary || 'No summary'}
   - Content excerpt: ${content}${content.length === 300 ? '...' : ''}`;
    })
    .join('\n\n');

  const n = clips.length;

  const prompts: Record<StudioContentType, { ko: string; en: string }> = {
    report: {
      ko: `[리포트 생성 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 리포트 작성 지침:\n1. 객관적이고 분석적인 톤으로 작성하세요.\n2. 데이터와 수치를 중심으로 구성하세요.\n3. 핵심 인사이트를 명확하게 도출하세요.\n4. 실행 가능한 결론을 제시하세요.\n\n📌 출력 형식 (Markdown):\n# 📊 [주제] 분석 리포트\n\n## 핵심 요약\n(3줄 이내)\n\n## 주요 발견점\n### 1. [첫 번째 발견]\n(상세 설명)\n\n## 데이터 기반 인사이트\n\n## 결론 및 제언\n\n⚠️ 제공된 클립 데이터만 사용하세요.`,
      en: `[Generate Report]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Report Guidelines:\n1. Write in an objective, analytical tone.\n2. Focus on data and metrics.\n3. Extract clear insights.\n4. Provide actionable conclusions.\n\n📌 Output Format (Markdown):\n# 📊 [Topic] Analysis Report\n\n## Executive Summary\n\n## Key Findings\n\n## Data-Driven Insights\n\n## Conclusions & Recommendations\n\n⚠️ Use ONLY the provided clip data.`,
    },
    planning: {
      ko: `[기획서 생성 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 📋 [프로젝트명] 기획서\n\n## 1. 개요\n### 배경\n### 목표\n\n## 2. 전략 방향\n\n## 3. 실행 계획\n### Phase 1\n- [ ] 액션 아이템\n\n## 4. 타임라인\n\n## 5. 성공 지표 (KPI)\n\n## 6. 리스크 및 대응 방안`,
      en: `[Generate Planning Document]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 📋 [Project Name] Planning Document\n\n## 1. Overview\n### Background\n### Objectives\n\n## 2. Strategic Direction\n\n## 3. Execution Plan\n### Phase 1\n- [ ] Action Item\n\n## 4. Timeline\n\n## 5. Success Metrics (KPIs)\n\n## 6. Risks & Mitigation`,
    },
    trend: {
      ko: `[트렌드 분석 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 📈 트렌드 분석 리포트\n\n## 핵심 트렌드 요약\n\n## 발견된 패턴\n### 🔥 상승 트렌드\n### 📉 하락 트렌드\n### 🆕 새롭게 등장한 주제\n\n## 시계열 분석\n\n## 향후 전망\n\n## 액션 포인트`,
      en: `[Generate Trend Analysis]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 📈 Trend Analysis Report\n\n## Key Trends Summary\n\n## Identified Patterns\n### 🔥 Rising Trends\n### 📉 Declining Trends\n### 🆕 Emerging Topics\n\n## Time-Series Analysis\n\n## Future Outlook\n\n## Action Points`,
    },
    'big-picture': {
      ko: `[전체 구조 파악 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 🗺️ 전체 구조 파악\n\n## 핵심 테마\n\n## 주요 개념 맵\n\n## 개념 간 연결고리\n\n## 한눈에 보는 요약`,
      en: `[Big Picture Breakdown]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 🗺️ Big Picture Overview\n\n## Core Themes\n\n## Key Concepts Map\n\n## Connections Between Concepts\n\n## Summary at a Glance`,
    },
    'step-by-step': {
      ko: `[기초부터 차근차근 학습 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 📚 단계별 학습 가이드\n\n## Level 1: 기초 개념\n## Level 2: 핵심 이해\n## Level 3: 실전 적용\n## Level 4: 고급 인사이트\n## 체크포인트`,
      en: `[Step-by-Step Learning Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 📚 Step-by-Step Learning Guide\n\n## Level 1: Foundations\n## Level 2: Core Understanding\n## Level 3: Practical Application\n## Level 4: Advanced Insights\n## Checkpoints`,
    },
    'chapter-lessons': {
      ko: `[섹션별 핵심 강의 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 📖 섹션별 핵심 강의\n\n## Lesson 1: [제목]\n### 핵심 내용\n### 실제 예시\n### ✅ 핵심 요약\n\n---\n\n## 전체 정리`,
      en: `[Chapter Lessons Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 📖 Chapter-by-Chapter Lessons\n\n## Lesson 1: [Title]\n### Key Content\n### Real Example\n### ✅ Key Takeaways\n\n---\n\n## Overall Summary`,
    },
    simplify: {
      ko: `[쉬운 풀이 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 💡 쉽게 풀어보기\n\n## 어려운 개념 1: [이름]\n### 원래 설명\n### 쉬운 비유\n### 실생활 예시\n\n## 한 문장 정리`,
      en: `[Simplify Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 💡 Simplified Explanations\n\n## Complex Concept 1: [Name]\n### Original Explanation\n### Simple Analogy\n### Real-Life Example\n\n## One-Sentence Summary`,
    },
    'key-concepts': {
      ko: `[핵심 용어 정리 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 📝 핵심 용어 사전\n\n## A-Z 용어집\n### [용어 1]\n📖 **정의**:\n💡 **핵심 포인트**:\n🔗 **관련 개념**:\n\n## 암기 카드 형식\n| 용어 | 한줄 정의 |\n|------|----------|\n\n## 개념 관계도`,
      en: `[Key Concepts Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 📝 Key Concepts Dictionary\n\n## A-Z Glossary\n### [Term 1]\n📖 **Definition**:\n💡 **Key Point**:\n🔗 **Related Concepts**:\n\n## Flashcard Format\n| Term | One-line Definition |\n|------|---------------------|\n\n## Concept Relationships`,
    },
    quiz: {
      ko: `[인출 학습 퀴즈 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 🎯 인출 학습 퀴즈\n\n## Quiz 1: 기초 확인\n### ❓ 질문\n### ✅ 정답\n### 📚 해설\n\n---\n\n## Quiz 2: 응용 문제\n## Quiz 3: 심화 문제\n\n## 자가 진단`,
      en: `[Quiz Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 🎯 Active Recall Quiz\n\n## Quiz 1: Basic Check\n### ❓ Question\n### ✅ Answer\n### 📚 Explanation\n\n---\n\n## Quiz 2: Application\n## Quiz 3: Advanced\n\n## Self-Assessment`,
    },
    'visual-map': {
      ko: `[시각적 구조화 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 🗺️ 시각적 구조화\n\n## 마인드맵 형태\n\n## 계층적 개요\n\n## 흐름도\n\n## 연결 관계 요약`,
      en: `[Visual Map Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 🗺️ Visual Structure\n\n## Mind Map Format\n\n## Hierarchical Outline\n\n## Flow Chart\n\n## Connection Summary`,
    },
    'review-notes': {
      ko: `[복습 노트 생성 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 📋 복습 노트\n\n## ⚡ 30초 요약\n\n## 🎯 꼭 기억할 것 TOP 5\n\n## 💡 핵심 인사이트\n\n## 🔑 키워드 정리\n\n## ✅ 액션 아이템`,
      en: `[Review Notes Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 📋 Review Notes\n\n## ⚡ 30-Second Summary\n\n## 🎯 Top 5 Must-Remember Points\n\n## 💡 Key Insight\n\n## 🔑 Keywords\n\n## ✅ Action Items`,
    },
    'teach-back': {
      ko: `[역설명 테스트 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 🎓 역설명 테스트\n\n## 질문 1: 기본 개념 확인\n### ❓ 질문\n### 📝 모범 답변\n### 🔍 체크포인트\n### 💡 놓쳤다면?\n\n## 종합 피드백`,
      en: `[Teach-Back Test Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 🎓 Teach-Back Test\n\n## Question 1: Basic Concept Check\n### ❓ Question\n### 📝 Model Answer\n### 🔍 Checkpoints\n### 💡 If You Missed Something\n\n## Overall Feedback`,
    },
    'sns-post': {
      ko: `[SNS 포스트 생성 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 📱 SNS 포스트\n\n## Twitter/X (280자)\n## LinkedIn\n## Instagram 캡션\n## 활용 팁\n\n⚠️ 제공된 클립 데이터만 사용하세요.`,
      en: `[SNS Post Generation Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 📱 SNS Posts\n\n## Twitter/X (280 chars)\n## LinkedIn\n## Instagram Caption\n## Tips\n\n⚠️ Use ONLY the provided clip data.`,
    },
    newsletter: {
      ko: `[뉴스레터 생성 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 📰 뉴스레터\n\n## [매력적인 제목]\n\n### 이번 호 미리보기\n### 주요 소식 1\n### 주요 소식 2\n### 이번 주 인사이트\n### 추천 행동\n\n⚠️ 제공된 클립 데이터만 사용하세요.`,
      en: `[Newsletter Generation Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 📰 Newsletter\n\n## [Compelling Title]\n\n### This Week's Preview\n### Story 1\n### Story 2\n### Key Insight\n### Recommended Action\n\n⚠️ Use ONLY the provided clip data.`,
    },
    presentation: {
      ko: `[프레젠테이션 생성 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 🎯 프레젠테이션 개요\n\n## 슬라이드 1: 타이틀\n## 슬라이드 2: 목차\n## 슬라이드 3-5: 핵심 내용\n## 슬라이드 6: 핵심 요약\n## 슬라이드 7: Q&A\n\n⚠️ 제공된 클립 데이터만 사용하세요.`,
      en: `[Presentation Generation Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 🎯 Presentation Outline\n\n## Slide 1: Title\n## Slide 2: Agenda\n## Slides 3-5: Key Content\n## Slide 6: Summary\n## Slide 7: Q&A / Closing\n\n⚠️ Use ONLY the provided clip data.`,
    },
    'email-draft': {
      ko: `[이메일 초안 생성 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 📧 이메일 초안\n\n## 버전 1: 간결한 버전\n**제목:**\n**본문:**\n\n## 버전 2: 상세 버전\n**제목:**\n**본문:**\n\n## 이메일 작성 팁\n\n⚠️ 제공된 클립 데이터만 사용하세요.`,
      en: `[Email Draft Generation Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 📧 Email Draft\n\n## Version 1: Concise\n**Subject:**\n**Body:**\n\n## Version 2: Detailed\n**Subject:**\n**Body:**\n\n## Email Tips\n\n⚠️ Use ONLY the provided clip data.`,
    },
    'blog-post': {
      ko: `[블로그 포스트 생성 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# [매력적인 블로그 제목]\n\n## 도입부\n## [섹션 1 제목]\n## [섹션 2 제목]\n## 핵심 정리\n## 마무리\n\n**SEO 메타 정보:**\n\n⚠️ 제공된 클립 데이터만 사용하세요.`,
      en: `[Blog Post Generation Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# [Compelling Blog Title]\n\n## Introduction\n## [Section 1 Title]\n## [Section 2 Title]\n## Key Takeaways\n## Conclusion\n\n**SEO Meta:**\n\n⚠️ Use ONLY the provided clip data.`,
    },
    'executive-summary': {
      ko: `[경영진 요약 생성 요청]\n\n다음은 사용자가 선택한 ${n}개의 클립입니다:\n\n${clipSummaries}\n\n📌 출력 형식 (Markdown):\n# 📋 경영진 요약 브리핑\n\n## 한 줄 요약\n## 현황 개요\n## 핵심 발견 (Top 3)\n## 리스크 및 기회\n## 권고 사항\n## 다음 단계\n\n⚠️ 제공된 클립 데이터만 사용하세요.`,
      en: `[Executive Summary Generation Request]\n\nHere are ${n} clips selected by the user:\n\n${clipSummaries}\n\n📌 Output Format (Markdown):\n# 📋 Executive Summary Briefing\n\n## One-Line Summary\n## Situation Overview\n## Key Findings (Top 3)\n## Risks & Opportunities\n## Recommendations\n## Next Steps\n\n⚠️ Use ONLY the provided clip data.`,
    },
  };

  return prompts[contentType][language];
};

// ─── Chat with clip ────────────────────────────────────────────────────────────

export interface ChatClipContext {
  currentClip: {
    title: string;
    url: string;
    summary?: string;
    tags?: string[];
    notes?: string;
  };
  relatedClips?: Array<{
    title: string;
    summary?: string;
    tags?: string[];
  }>;
  userInterests?: string[];
}

export const buildChatWithClipPrompt = (
  message: string,
  context: ChatClipContext,
  language: 'ko' | 'en'
): string => {
  const currentClipContext = [
    '[현재 클립]',
    `제목: ${context.currentClip.title}`,
    `URL: ${context.currentClip.url}`,
    context.currentClip.summary ? `요약: ${context.currentClip.summary}` : '',
    context.currentClip.tags?.length
      ? `태그: ${context.currentClip.tags.join(', ')}`
      : '',
    context.currentClip.notes
      ? `사용자 메모: ${context.currentClip.notes}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  let relatedContext = '';
  if (context.relatedClips && context.relatedClips.length > 0) {
    relatedContext =
      `\n\n[관련 클립 (${context.relatedClips.length}개)]\n` +
      context.relatedClips
        .map(
          (clip, i) =>
            `${i + 1}. ${clip.title}${clip.summary ? ` - ${clip.summary.slice(0, 100)}...` : ''}${clip.tags?.length ? ` (${clip.tags.slice(0, 3).join(', ')})` : ''}`
        )
        .join('\n');
  }

  let interestsContext = '';
  if (context.userInterests && context.userInterests.length > 0) {
    interestsContext = '\n\n[사용자 관심사]: ' + context.userInterests.join(', ');
  }

  const fullContext = currentClipContext + relatedContext + interestsContext;

  return language === 'ko'
    ? `당신은 Linkbrain의 지식 어시스턴트입니다.
사용자가 저장한 콘텐츠를 기반으로 질문에 답변합니다.

[제공된 맥락]
${fullContext}

[사용자 질문]
${message}

[답변 지침]
1. 제공된 맥락에 있는 정보만 사용하세요.
2. 맥락에 없는 정보는 추측하지 마세요.
3. 관련 클립들 간의 연결점이 있다면 언급해주세요.
4. 답변은 명확하고 실용적으로 작성하세요.
5. 필요시 다음 단계나 후속 질문을 제안해주세요.`
    : `You are Linkbrain's knowledge assistant.
Answer questions based on the user's saved content.

[Provided Context]
${fullContext}

[User Question]
${message}

[Response Guidelines]
1. Use ONLY information from the provided context.
2. Do NOT speculate on information not in the context.
3. If there are connections between related clips, mention them.
4. Write clear and practical answers.
5. Suggest next steps or follow-up questions if appropriate.`;
};
