/**
 * Studio 시스템 프롬프트 조립 (순수 함수 — DB/네트워크 의존 없음)
 *
 * 분량 지시는 STUDIO_FORMATS 한 곳에서만 나온다.
 * 유형별 .md 가이드는 참고 자료로 뒤에 붙되, 분량이 충돌하면 위 지시가 이긴다는
 * 우선순위를 프롬프트 안에 명시한다.
 */

import type { ContentStudioType } from '@/config/constants';
import { STUDIO_FORMATS, type StudioLength } from './studio-formats';

export const TONE_LABELS: Record<string, string> = {
  professional: '전문적인',
  casual: '친근한',
  academic: '학술적인',
  creative: '창의적인',
  concise: '간결한',
};

export interface SystemPromptArgs {
  type: ContentStudioType;
  tone: string;
  length: StudioLength;
  /** 유형별 .md 전문 가이드 (없으면 빈 문자열) */
  guideSection?: string;
  /** 집단 학습 패턴 (없으면 빈 문자열) */
  collectiveSection?: string;
}

export function buildSystemPrompt(args: SystemPromptArgs): string {
  const format = STUDIO_FORMATS[args.type];
  const toneLabel = TONE_LABELS[args.tone] ?? args.tone;
  const target = format.targets[args.length];

  const outputRule =
    format.output === 'markdown'
      ? '- 마크다운으로 작성한다 (제목 #/##, 강조 **, 목록 -, 인용 >, 표). 전체를 코드펜스로 감싸지 말 것'
      : '- 플랫폼에 그대로 붙여넣을 평문으로 작성한다. 마크다운 헤딩(#)·볼드(**)를 쓰지 말 것';

  return [
    `당신은 ${format.label}을(를) 실제로 발행해 성과를 내본 전문 작가입니다.`,
    `아래 소스 자료를 재료로 ${toneLabel} 톤의 ${format.label}을(를) 새로 씁니다.`,
    '',
    '[분량 — 이 지시가 최우선이며, 아래 가이드와 어긋나면 이 지시를 따른다]',
    `- ${target}`,
    '',
    '[플랫폼 문법]',
    ...format.instructions.map((line) => `- ${line}`),
    '',
    '[공통 규칙]',
    '- 한국어로 작성한다',
    outputRule,
    '- 소스 자료의 사실·수치·고유명사만 사용한다. 없는 정보를 지어내지 않는다',
    '- 소스 문장을 그대로 옮기지 말고 재구성해 새 콘텐츠로 만든다',
    '- 소스가 여러 개면 공통 주제로 엮어 하나의 관점을 만든다. 억지로 묶이지 않으면 가장 강한 소스를 중심에 두고 나머지를 보조 근거·대비 사례로 활용한다',
    '- 메타 발언("아래는 ~입니다", "요청하신 ~")이나 마무리 인사 없이 결과물만 출력한다',
    args.guideSection ?? '',
    args.collectiveSection ?? '',
  ].join('\n');
}

export function buildUserPrompt(sourceMaterial: string): string {
  return `[소스 자료]\n\n${sourceMaterial}`;
}
