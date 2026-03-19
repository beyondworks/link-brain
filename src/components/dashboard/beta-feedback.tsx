'use client';

import { useState, useRef } from 'react';
import { MessageSquarePlus, Send, Loader2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: 'bug', label: '버그 신고', emoji: '🐛' },
  { value: 'feature', label: '기능 요청', emoji: '💡' },
  { value: 'improvement', label: '개선 제안', emoji: '✨' },
  { value: 'other', label: '기타', emoji: '💬' },
];

export function BetaFeedback() {
  const { user } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('improvement');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    if (!message.trim() || !user) return;

    setIsSending(true);
    try {
      const insertData = {
        user_id: user.id,
        type: feedbackType as string,
        message: message.trim(),
      };
      const { error } = await supabase.from('beta_feedback').insert(insertData);

      if (error) throw error;

      toast.success('소중한 의견 감사합니다!');
      setMessage('');
      setIsOpen(false);
    } catch {
      // Fallback: table might not exist yet, save to localStorage
      const feedbacks = JSON.parse(localStorage.getItem('beta_feedback') ?? '[]') as unknown[];
      feedbacks.push({
        type: feedbackType,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('beta_feedback', JSON.stringify(feedbacks));
      toast.success('의견이 저장되었습니다. 감사합니다!');
      setMessage('');
      setIsOpen(false);
    } finally {
      setIsSending(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => textareaRef.current?.focus(), 100);
        }}
        aria-expanded={false}
        aria-label="피드백 보내기"
        className="group flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-border/60 bg-card/60 px-4 py-3 text-left transition-all duration-200 hover:border-primary/30 hover:bg-brand-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted transition-colors group-hover:bg-primary/15">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">클로즈 베타 피드백</p>
          <p className="text-xs text-muted-foreground">불편한 점이나 개선 아이디어를 알려주세요</p>
        </div>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:text-primary" />
      </button>
    );
  }

  return (
    <div className="animate-fade-in-up rounded-xl border border-primary/20 bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">피드백 보내기</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Beta</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          aria-label="피드백 닫기"
          className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Type selector */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FEEDBACK_TYPES.map(({ value, label, emoji }) => (
          <button
            key={value}
            onClick={() => setFeedbackType(value)}
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              feedbackType === value
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <span className="text-[11px]">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Message input */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="어떤 점이 불편하셨나요? 어떤 기능이 있으면 좋을까요?"
        rows={3}
        className="mb-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />

      {/* Submit */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/50">Cmd+Enter로 전송</span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!message.trim() || isSending}
          className="gap-1.5 rounded-lg text-xs"
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              보내기
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
