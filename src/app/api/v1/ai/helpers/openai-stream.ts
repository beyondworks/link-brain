// ─── OpenAI fetch 헬퍼 ───────────────────────────────────────────────────────

interface OpenAIStreamChunk {
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
}

export async function* streamOpenAI(systemPrompt: string, userPrompt: string, apiKey?: string, model?: string): AsyncGenerator<string> {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model ?? 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) {
      throw Object.assign(new Error('OpenAI 크레딧 부족 또는 요청 한도 초과'), { status: 402 });
    }
    throw new Error(`OpenAI API 오류 (${res.status}): ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('응답 스트림을 읽을 수 없습니다.');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        try {
          const chunk = JSON.parse(jsonStr) as OpenAIStreamChunk;
          const content = chunk.choices[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // JSON 파싱 실패 시 스킵
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── OpenAI 비스트리밍 헬퍼 ─────────────────────────────────────────────────

export async function callOpenAI(systemPrompt: string, userPrompt: string, apiKey?: string, model?: string): Promise<string> {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model ?? 'gpt-4o-mini',
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw Object.assign(new Error('OpenAI 크레딧 부족 또는 요청 한도 초과'), { status: 402 });
    }
    const errText = await res.text();
    throw new Error(`OpenAI API 오류 (${res.status}): ${errText}`);
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> };
  return json.choices[0]?.message?.content ?? '';
}
