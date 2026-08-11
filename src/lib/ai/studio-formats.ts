/**
 * Studio 콘텐츠 포맷 정의 — 단일 진실 공급원(single source of truth)
 *
 * 타입별 "플랫폼 문법"과 길이 선택지(short/medium/long)가 각 포맷에서
 * 실제로 의미하는 분량을 한 곳에서 정의한다.
 * 서버(프롬프트 생성)와 클라이언트(길이 선택 UI)가 같은 표를 참조하므로
 * "시스템 프롬프트는 500자, 가이드는 2500자" 같은 모순이 생기지 않는다.
 *
 * 이 파일은 브라우저에서도 import 되므로 Node 전용 API(fs 등)를 쓰지 않는다.
 */

import type { ContentStudioType } from '@/config/constants';

export const STUDIO_LENGTHS = ['short', 'medium', 'long'] as const;
export type StudioLength = (typeof STUDIO_LENGTHS)[number];

export interface StudioFormat {
  /** 사람이 읽는 포맷 이름 */
  label: string;
  /** 출력 형식: 마크다운 문서 / 플랫폼에 그대로 붙여넣는 평문 */
  output: 'markdown' | 'plain';
  /** 플랫폼 문법 (6줄 이내) */
  instructions: string[];
  /** 길이 선택지 → 프롬프트에 주입될 실제 분량 지시 */
  targets: Record<StudioLength, string>;
  /** 길이 선택 UI에 보일 라벨 */
  pickerLabels: Record<StudioLength, string>;
}

export const STUDIO_FORMATS: Record<ContentStudioType, StudioFormat> = {
  blog_post: {
    label: '블로그 포스트',
    output: 'markdown',
    instructions: [
      '제목은 H1 한 줄(40~55자, 가능하면 숫자 포함), 본문은 H2 소제목 3~5개로 분해하고 필요할 때만 H3를 쓴다',
      '도입 3문장: ①독자가 겪는 문제 ②왜 지금 중요한지 ③이 글을 읽으면 얻는 것',
      '각 H2 섹션 = 주장 1개 + 근거·사례·수치 + 마지막 한 줄 정리',
      '한 단락 2~4문장, 문장은 짧게. 리스트는 섹션당 1개 이하로 절제하고 나머지는 산문으로 쓴다',
      '결론 섹션: 핵심 3줄 요약 + 독자가 오늘 실행할 행동 1가지',
      '"안녕하세요, 오늘은 ~에 대해 알아보겠습니다" 류 인삿말과 근거 없는 수치는 금지',
    ],
    targets: {
      short: '본문 1,000자 내외 (H2 소제목 2~3개)',
      medium: '본문 2,200자 내외 (H2 소제목 3~4개)',
      long: '본문 3,500자 내외 (H2 소제목 5개 이상, 각 섹션 깊이 있게)',
    },
    pickerLabels: {
      short: '짧게 (1,000자 내외)',
      medium: '중간 (2,200자 내외)',
      long: '길게 (3,500자 내외)',
    },
  },

  threads_post: {
    label: 'Threads 포스트',
    output: 'plain',
    instructions: [
      '첫 줄은 훅 27자 이내 — 숫자·반전·질문 중 하나. 인삿말과 배경 설명으로 시작하지 않는다',
      '한 문단은 2줄 이하, 문단 사이는 빈 줄로 띄워 호흡을 만든다',
      '연속 게시일 때는 [1/n] 표기와 훅을 같은 줄에 붙여 쓰고, 스레드 1개는 500자를 넘지 않는다',
      '스레드 1개 = 완결된 메시지 1개. 다음 스레드로 넘어갈 이유(궁금증)를 끝에 남긴다',
      '마지막 스레드에 CTA(댓글 질문 또는 저장 유도) + 해시태그 3~5개',
      '구어체("~거든요", "~더라고요")를 쓰고 마크다운 헤딩·볼드·불렛 기호는 쓰지 않는다',
    ],
    targets: {
      short: '단일 스레드 1개 (500자 이내)',
      medium: '3연속 스레드 ([1/3]~[3/3], 각 500자 이내)',
      long: '5연속 스레드 ([1/5]~[5/5], 각 500자 이내)',
    },
    pickerLabels: {
      short: '짧게 (스레드 1개)',
      medium: '중간 (3연속 스레드)',
      long: '길게 (5연속 스레드)',
    },
  },

  instagram_feed: {
    label: '인스타그램 피드',
    output: 'plain',
    instructions: [
      '슬라이드를 "[1] 제목" 형식으로 번호와 함께 구분해 출력한다',
      '1번은 커버 — 훅 15자 내외 한 줄 + 부제 한 줄. 내용을 전부 노출하지 않는다',
      '2번에서 "왜 지금 봐야 하는지"를 확정하고, 중간 슬라이드는 슬라이드당 핵심 1개(본문 40자 이내)만 담는다',
      '마지막 슬라이드는 저장 유도 CTA("저장해두고 필요할 때 꺼내 보세요")',
      '슬라이드 뒤에 [캡션] 블록(첫 줄 요약 + 2~3줄 부연)과 [해시태그] 블록(대·중·소 혼합 12~20개)을 붙인다',
      '마크다운 헤딩·볼드는 쓰지 않는다 — 인스타에 그대로 붙여넣을 평문으로 쓴다',
    ],
    targets: {
      short: '슬라이드 5장 (커버 1 + 본문 3 + CTA 1)',
      medium: '슬라이드 8장 (커버 1 + 본문 6 + CTA 1)',
      long: '슬라이드 10장 (커버 1 + 본문 8 + CTA 1)',
    },
    pickerLabels: {
      short: '짧게 (5장)',
      medium: '중간 (8장)',
      long: '길게 (10장)',
    },
  },

  newsletter: {
    label: '뉴스레터',
    output: 'markdown',
    instructions: [
      '맨 위에 "제목 A안 / 제목 B안"(각 25~40자) 2개와 프리뷰 텍스트(40~60자)를 먼저 제시한다',
      '인사는 2줄 이내로 끝내고 바로 본론 — "안녕하세요, 오늘은~" 금지',
      'H2 섹션 3개 내외, 각 섹션 첫 줄에 굵게 한 줄 요약을 두고 그 아래 본문을 쓴다',
      '스캔 가능하게: 섹션당 불렛 3개 이하, 출처 링크는 인라인 마크다운 링크로',
      '마무리는 이번 호 한 줄 정리 + 명확한 CTA 링크 1개',
      '편지체("~했어요", "~거든요")를 유지하고 이모지는 섹션당 최대 1개',
    ],
    targets: {
      short: '본문 800자 내외 (섹션 2개)',
      medium: '본문 1,500자 내외 (섹션 3개)',
      long: '본문 2,500자 내외 (섹션 4~5개)',
    },
    pickerLabels: {
      short: '짧게 (800자 내외)',
      medium: '중간 (1,500자 내외)',
      long: '길게 (2,500자 내외)',
    },
  },

  executive_summary: {
    label: '요약 보고서',
    output: 'markdown',
    instructions: [
      '맨 앞 "## 핵심 결론"에 판단 3줄 — 결론과 근거 수치를 먼저 쓴다',
      '이어서 "## 배경/현황", "## 시사점", "## 리스크", "## 권고안"을 H2로 구성한다',
      '각 항목은 불렛 1줄. 수식어를 걷어내고 사실·수치·판단만 남긴다',
      '수치는 소스에 있는 값만 그대로 인용하고, 불확실하면 "~로 추정"을 명시한다',
      '마지막 "## 의사결정 요청"에 결정이 필요한 사항 1~3개를 선택지 형태로 제시한다',
      '감정적 표현·수사적 질문·3줄 이상 단락 금지',
    ],
    targets: {
      short: '500자 내외 (불렛 5~6개)',
      medium: '1,000자 내외 (불렛 8~10개)',
      long: '1,500자 내외 (불렛 12개 이상, 섹션별 근거 포함)',
    },
    pickerLabels: {
      short: '짧게 (500자 내외)',
      medium: '중간 (1,000자 내외)',
      long: '길게 (1,500자 내외)',
    },
  },

  key_concepts: {
    label: '핵심 포인트',
    output: 'markdown',
    instructions: [
      '개념마다 "### N. 개념명" + 한 줄 정의 + 왜 중요한지 2문장 구조로 쓴다',
      '각 개념에 소스에 등장한 구체 사례나 수치를 1개씩 붙인다',
      '마지막에 "## 개념 지도" 섹션을 두고 개념 간 관계를 "A → B (전제)" 형태로 정리한다',
      '중복되는 개념은 병합하고, "혁신·시너지" 같은 추상어를 단독으로 쓰지 않는다',
      '소스에 없는 개념은 만들지 않는다',
    ],
    targets: {
      short: '핵심 개념 5개',
      medium: '핵심 개념 7개',
      long: '핵심 개념 10개 (각 개념 설명을 더 깊이)',
    },
    pickerLabels: {
      short: '짧게 (5개념)',
      medium: '중간 (7개념)',
      long: '길게 (10개념)',
    },
  },

  presentation_text: {
    label: '발표용 텍스트',
    output: 'markdown',
    instructions: [
      '슬라이드마다 "## 슬라이드 N — 제목(20자 이내)" 헤딩으로 시작한다',
      '슬라이드 본문은 불렛 3개 이하, 각 30자 이내 — 읽어주는 자료가 아니라 보조 화면이다',
      '각 슬라이드 아래 "> 발표 노트:" 로 실제 말할 문장 3~4줄(구어체, 전환 멘트 포함)을 붙인다',
      '1장은 표지, 2장은 문제 제기/목차, 마지막 장은 요청과 다음 단계로 닫는다',
      '수치 비교는 표 또는 "A 대비 B" 대비 문장으로 제시해 시각화가 가능하게 한다',
      '한 슬라이드 = 한 주장 원칙을 지킨다',
    ],
    targets: {
      short: '슬라이드 5장',
      medium: '슬라이드 10장',
      long: '슬라이드 15장',
    },
    pickerLabels: {
      short: '짧게 (5장)',
      medium: '중간 (10장)',
      long: '길게 (15장)',
    },
  },

  youtube_script: {
    label: '유튜브 대본',
    output: 'markdown',
    instructions: [
      '첫 15초 훅은 그대로 읽을 수 있는 완성된 대사로 쓴다 (결론 선행·반전·숫자 중 하나)',
      '"## 00:00 인트로" 형식의 타임스탬프 챕터로 구간을 나눈다',
      '구어체 단문 — 한 문장 40자 이내, 끊어 읽을 곳에 (호흡) 표기를 넣는다',
      '30~60초마다 이탈 방지 훅(다음 내용 예고·질문)을 삽입한다',
      '화면 지시는 [화면: ...] 대괄호로 대사와 분리한다',
      '아웃트로는 3줄 요약 + 구독/댓글 CTA로 닫는다. "안녕하세요 오늘은~" 시작 금지',
    ],
    targets: {
      short: '약 1분 분량 (대사 350자 내외, 챕터 2개)',
      medium: '약 3분 분량 (대사 1,100자 내외, 챕터 3~4개)',
      long: '약 5분 분량 (대사 1,800자 내외, 챕터 5개 이상)',
    },
    pickerLabels: {
      short: '짧게 (약 1분)',
      medium: '중간 (약 3분)',
      long: '길게 (약 5분)',
    },
  },
};

/** 길이 값이 유효한지 확인 */
export function isStudioLength(v: unknown): v is StudioLength {
  return typeof v === 'string' && (STUDIO_LENGTHS as readonly string[]).includes(v);
}

/** 해당 포맷/길이의 분량 지시 (유일한 출처) */
export function getLengthTarget(type: ContentStudioType, length: StudioLength): string {
  return STUDIO_FORMATS[type].targets[length];
}
