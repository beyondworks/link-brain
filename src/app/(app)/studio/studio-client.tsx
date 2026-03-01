'use client';

import { useState } from 'react';
import { CONTENT_STUDIO_TYPES } from '@/config/constants';
import type { ContentStudioType } from '@/config/constants';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';

const STUDIO_LABELS: Record<ContentStudioType, string> = {
  blog_post: '블로그 포스트',
  sns_post: 'SNS 포스트',
  newsletter: '뉴스레터',
  email_draft: '이메일 초안',
  executive_summary: '요약 보고서',
  key_concepts: '핵심 개념',
  quiz: '퀴즈',
  mind_map: '마인드맵',
  review_notes: '복습 노트',
  teach_back: '설명하기',
  simplified_summary: '쉬운 요약',
};

export function StudioClient() {
  const [selectedType, setSelectedType] = useState<ContentStudioType>('blog_post');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // TODO: Connect to AI service
    setTimeout(() => {
      setOutput('AI 콘텐츠 생성 기능은 Phase 4에서 연결됩니다.');
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Content Studio</h1>
        <p className="mt-1 text-muted-foreground">
          클립을 기반으로 다양한 콘텐츠를 생성하세요
        </p>
      </div>

      {/* Content type selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CONTENT_STUDIO_TYPES.map((type) => (
          <Button
            key={type}
            variant={selectedType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(type)}
          >
            {STUDIO_LABELS[type]}
          </Button>
        ))}
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="mb-6"
      >
        <Sparkles size={16} className="mr-2" />
        {isGenerating ? '생성 중...' : '콘텐츠 생성'}
      </Button>

      {/* Output */}
      {output && (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-2">
            <span className="text-sm font-medium">생성 결과</span>
          </div>
          <Textarea
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            className="min-h-[300px] resize-none border-0 focus-visible:ring-0"
            placeholder="생성된 콘텐츠가 여기에 표시됩니다..."
          />
        </div>
      )}
    </div>
  );
}
