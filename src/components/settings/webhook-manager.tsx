'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, TestTube2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'linkbrain-webhooks';

const WEBHOOK_EVENTS = [
  { id: 'clip.created', label: '클립 생성' },
  { id: 'clip.updated', label: '클립 수정' },
  { id: 'clip.deleted', label: '클립 삭제' },
  { id: 'clip.analyzed', label: 'AI 분석 완료' },
] as const;

type WebhookEventId = (typeof WEBHOOK_EVENTS)[number]['id'];

interface Webhook {
  id: string;
  url: string;
  events: WebhookEventId[];
  isActive: boolean;
  secret?: string;
  createdAt: string;
  lastTriggered?: string;
}

function loadWebhooks(): Webhook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Webhook[];
  } catch {
    // localStorage 접근 불가 시 빈 배열 반환
  }
  return [];
}

function saveWebhooks(webhooks: Webhook[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(webhooks));
  } catch {
    // localStorage 접근 불가 시 무시
  }
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventId[]>(['clip.created']);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setWebhooks(loadWebhooks());
  }, []);

  const toggleEvent = useCallback((eventId: WebhookEventId) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId],
    );
  }, []);

  function resetDialog() {
    setUrl('');
    setSecret('');
    setSelectedEvents(['clip.created']);
  }

  function handleAdd() {
    const trimmedUrl = url.trim();
    if (!isValidUrl(trimmedUrl)) {
      toast.error('올바른 URL을 입력해 주세요 (http:// 또는 https://)');
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error('최소 하나의 이벤트를 선택해 주세요');
      return;
    }

    setSaving(true);
    const newWebhook: Webhook = {
      id: crypto.randomUUID(),
      url: trimmedUrl,
      events: selectedEvents,
      isActive: true,
      secret: secret.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...webhooks, newWebhook];
    setWebhooks(updated);
    saveWebhooks(updated);
    toast.success('웹훅이 추가되었습니다');
    setDialogOpen(false);
    resetDialog();
    setSaving(false);
  }

  async function handleTest(webhook: Webhook) {
    setTestingId(webhook.id);
    try {
      const payload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: { message: 'Linkbrain 웹훅 테스트 페이로드입니다.' },
      };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (webhook.secret) {
        headers['X-Webhook-Secret'] = webhook.secret;
      }
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(`테스트 성공 (${res.status})`);
      } else {
        toast.error(`테스트 실패 — 서버 응답: ${res.status}`);
      }
    } catch {
      toast.error('웹훅 URL에 연결할 수 없습니다');
    } finally {
      setTestingId(null);
    }
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    const updated = webhooks.filter((w) => w.id !== id);
    setWebhooks(updated);
    saveWebhooks(updated);
    toast.success('웹훅이 삭제되었습니다');
    setDeletingId(null);
  }

  function handleToggleActive(id: string) {
    const updated = webhooks.map((w) =>
      w.id === id ? { ...w, isActive: !w.isActive } : w,
    );
    setWebhooks(updated);
    saveWebhooks(updated);
  }

  return (
    <>
      <p className="mb-4 text-xs text-muted-foreground">
        클립 이벤트 발생 시 외부 URL로 HTTP POST 요청을 보냅니다.
      </p>

      {webhooks.length === 0 ? (
        <div className="mb-4 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            등록된 웹훅이 없습니다. 외부 서비스 연동을 위해 추가하세요.
          </p>
        </div>
      ) : (
        <div className="mb-4 space-y-2">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3"
            >
              {/* 상태 아이콘 */}
              <button
                type="button"
                onClick={() => handleToggleActive(wh.id)}
                className="mt-0.5 shrink-0 transition-colors"
                aria-label={wh.isActive ? '비활성화' : '활성화'}
                title={wh.isActive ? '클릭하여 비활성화' : '클릭하여 활성화'}
              >
                {wh.isActive ? (
                  <CheckCircle2 size={16} className="text-primary" />
                ) : (
                  <XCircle size={16} className="text-muted-foreground" />
                )}
              </button>

              {/* 정보 */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-foreground">{wh.url}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {wh.events.map((ev) => (
                    <span
                      key={ev}
                      className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>생성: {formatDate(wh.createdAt)}</span>
                  {wh.lastTriggered && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      마지막 호출: {formatDate(wh.lastTriggered)}
                    </span>
                  )}
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-lg p-0 text-muted-foreground hover:text-foreground transition-spring"
                  disabled={testingId === wh.id}
                  onClick={() => void handleTest(wh)}
                  aria-label="테스트 전송"
                  title="테스트 페이로드 전송"
                >
                  <TestTube2 size={13} className={cn(testingId === wh.id && 'animate-pulse')} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-lg p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-spring"
                  disabled={deletingId === wh.id}
                  onClick={() => handleDelete(wh.id)}
                  aria-label="웹훅 삭제"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        className="gap-2 rounded-xl transition-spring hover:border-primary/30 hover:glow-brand-sm"
        onClick={() => setDialogOpen(true)}
      >
        <Plus size={14} />
        웹훅 추가
      </Button>

      {/* 추가 Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">웹훅 추가</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              이벤트 발생 시 POST 요청을 받을 URL과 구독할 이벤트를 선택하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* URL */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">엔드포인트 URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="rounded-xl focus-visible:ring-primary/30"
              />
            </div>

            {/* 이벤트 선택 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">구독 이벤트</Label>
              <div className="space-y-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`event-${ev.id}`}
                      checked={selectedEvents.includes(ev.id)}
                      onCheckedChange={() => toggleEvent(ev.id)}
                    />
                    <label
                      htmlFor={`event-${ev.id}`}
                      className="cursor-pointer text-sm text-foreground"
                    >
                      {ev.label}
                      <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                        ({ev.id})
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 시크릿 (선택) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                시크릿 헤더{' '}
                <span className="font-normal text-muted-foreground">(선택)</span>
              </Label>
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="X-Webhook-Secret 헤더에 포함될 값"
                className="rounded-xl focus-visible:ring-primary/30"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 gap-2 rounded-xl bg-gradient-brand glow-brand shadow-none transition-spring hover-scale font-semibold"
                onClick={handleAdd}
                disabled={saving}
              >
                <Plus size={14} />
                추가
              </Button>
              <Button
                variant="outline"
                className="rounded-xl transition-spring"
                onClick={() => {
                  setDialogOpen(false);
                  resetDialog();
                }}
              >
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
