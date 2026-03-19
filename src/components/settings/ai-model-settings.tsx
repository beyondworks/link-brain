'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Brain, Globe, Bot, Key, Trash2, Check, Loader2, Sparkles, MessageSquare } from 'lucide-react';

interface AIKey {
  id: string;
  provider: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
}

interface AIConfig {
  default_provider: string;
  default_model: string | null;
  chat_provider: string | null;
  chat_model: string | null;
}

interface ModelOption {
  id: string;
  name: string;
  description: string;
}

interface AvailableModels {
  server: ModelOption[];
  openai: ModelOption[];
  google: ModelOption[];
  anthropic: ModelOption[];
}

const PROVIDER_META: Record<
  string,
  { icon: typeof Brain; label: string; color: string; gradient: string; placeholder: string }
> = {
  openai: {
    icon: Brain,
    label: 'OpenAI',
    color: 'text-emerald-500',
    gradient: 'from-emerald-500/20 to-emerald-500/5',
    placeholder: 'sk-proj-...',
  },
  google: {
    icon: Globe,
    label: 'Google AI',
    color: 'text-blue-500',
    gradient: 'from-blue-500/20 to-blue-500/5',
    placeholder: 'AIza...',
  },
  anthropic: {
    icon: Bot,
    label: 'Anthropic',
    color: 'text-violet-500',
    gradient: 'from-violet-500/20 to-violet-500/5',
    placeholder: 'sk-ant-...',
  },
};

export function AIModelSettings() {
  const [config, setConfig] = useState<AIConfig>({
    default_provider: 'server',
    default_model: null,
    chat_provider: null,
    chat_model: null,
  });
  const [keys, setKeys] = useState<AIKey[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModels | null>(null);
  const [loading, setLoading] = useState(true);
  const [newKeys, setNewKeys] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [useChatOverride, setUseChatOverride] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/ai-config');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = (await res.json()) as {
        data: { config: AIConfig; keys: AIKey[]; availableModels: AvailableModels };
      };
      setConfig(json.data.config);
      setKeys(json.data.keys);
      setAvailableModels(json.data.availableModels);
      setUseChatOverride(
        !!json.data.config.chat_provider && json.data.config.chat_provider !== 'server',
      );
    } catch {
      toast.error('AI 설정을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const updateConfig = async (updates: Partial<AIConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    try {
      const res = await fetch('/api/v1/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultProvider: newConfig.default_provider,
          defaultModel: newConfig.default_model,
          chatProvider: newConfig.chat_provider,
          chatModel: newConfig.chat_model,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('AI 설정이 저장되었습니다');
    } catch {
      toast.error('설정 저장에 실패했습니다');
    }
  };

  const registerKey = async (provider: string) => {
    const apiKey = newKeys[provider]?.trim();
    if (!apiKey || apiKey.length < 10) {
      toast.error('유효한 API 키를 입력하세요');
      return;
    }
    setSavingKey(provider);
    try {
      const res = await fetch('/api/v1/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, name: `${provider} key` }),
      });
      if (!res.ok) throw new Error('Failed');
      setNewKeys((prev) => ({ ...prev, [provider]: '' }));
      toast.success(`${PROVIDER_META[provider]?.label ?? provider} 키가 등록되었습니다`);
      void fetchConfig();
    } catch {
      toast.error('키 등록에 실패했습니다');
    } finally {
      setSavingKey(null);
    }
  };

  const deleteKey = async (keyId: string, provider: string) => {
    try {
      const res = await fetch(`/api/v1/ai-config?id=${keyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('키가 삭제되었습니다');
      if (config.default_provider === provider) {
        await updateConfig({ default_provider: 'server', default_model: null });
      }
      void fetchConfig();
    } catch {
      toast.error('키 삭제에 실패했습니다');
    }
  };

  const getActiveKey = (provider: string) =>
    keys.find((k) => k.provider === provider && k.is_active);

  const connectedProviders = [
    'server',
    ...keys.filter((k) => k.is_active).map((k) => k.provider),
  ];

  const getModels = (provider: string): ModelOption[] => {
    if (!availableModels) return [];
    return (availableModels as unknown as Record<string, ModelOption[]>)[provider] ?? [];
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">AI 모델 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* API Key Registration */}
      <Card className="card-glow card-inner-glow rounded-2xl border border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 ring-1 ring-cyan-500/20">
              <Key size={15} className="text-cyan-500" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                외부 AI 모델 연결
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                API 키를 등록하면 해당 모델을 크레딧 없이 사용할 수 있습니다
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(PROVIDER_META).map(([provider, meta]) => {
            const Icon = meta.icon;
            const activeKey = getActiveKey(provider);
            return (
              <div
                key={provider}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/10 p-4"
              >
                <div
                  className={cn(
                    'rounded-lg bg-gradient-to-br p-2 ring-1 ring-white/10',
                    meta.gradient,
                  )}
                >
                  <Icon size={14} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{meta.label}</p>
                  {activeKey ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <Check size={10} /> 연결됨
                      </span>
                      <code className="text-[11px] text-muted-foreground">
                        {activeKey.key_prefix}
                      </code>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Input
                        type="password"
                        placeholder={meta.placeholder}
                        value={newKeys[provider] ?? ''}
                        onChange={(e) =>
                          setNewKeys((prev) => ({ ...prev, [provider]: e.target.value }))
                        }
                        className="h-8 text-xs rounded-lg flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => void registerKey(provider)}
                        disabled={savingKey === provider}
                        className="h-8 rounded-lg text-xs shrink-0"
                      >
                        {savingKey === provider ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          '등록'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                {activeKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void deleteKey(activeKey.id, provider)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Default Model Selection */}
      <Card className="card-glow card-inner-glow rounded-2xl border border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 ring-1 ring-amber-500/20">
              <Sparkles size={15} className="text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                기본 AI 모델
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                요약, 스튜디오, 인사이트, 채팅 모두에 적용됩니다
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">프로바이더</Label>
              <Select
                value={config.default_provider}
                onValueChange={(v) => {
                  const models = getModels(v);
                  void updateConfig({ default_provider: v, default_model: models[0]?.id ?? null });
                }}
              >
                <SelectTrigger className="rounded-xl focus:ring-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {connectedProviders.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === 'server' ? '서버 기본 (크레딧)' : (PROVIDER_META[p]?.label ?? p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">모델</Label>
              <Select
                value={config.default_model ?? ''}
                onValueChange={(v) => void updateConfig({ default_model: v })}
              >
                <SelectTrigger className="rounded-xl focus:ring-primary/30">
                  <SelectValue placeholder="모델 선택" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {getModels(config.default_provider).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span>{m.name}</span>
                      {m.description && (
                        <span className="ml-2 text-muted-foreground text-[11px]">
                          {m.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat-specific Model */}
      <Card className="card-glow card-inner-glow rounded-2xl border border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="icon-glow relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 ring-1 ring-blue-500/20">
                <MessageSquare size={15} className="text-blue-500" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold text-foreground">
                  채팅 전용 모델
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {useChatOverride ? '채팅에만 다른 모델을 사용합니다' : '앱 기본 모델과 동일'}
                </p>
              </div>
            </div>
            <Switch
              checked={useChatOverride}
              onCheckedChange={(checked) => {
                setUseChatOverride(checked);
                if (!checked) {
                  void updateConfig({ chat_provider: null, chat_model: null });
                }
              }}
            />
          </div>
        </CardHeader>
        {useChatOverride && (
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">프로바이더</Label>
                <Select
                  value={config.chat_provider ?? 'server'}
                  onValueChange={(v) => {
                    const models = getModels(v);
                    void updateConfig({ chat_provider: v, chat_model: models[0]?.id ?? null });
                  }}
                >
                  <SelectTrigger className="rounded-xl focus:ring-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {connectedProviders.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p === 'server' ? '서버 기본 (크레딧)' : (PROVIDER_META[p]?.label ?? p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">모델</Label>
                <Select
                  value={config.chat_model ?? ''}
                  onValueChange={(v) => void updateConfig({ chat_model: v })}
                >
                  <SelectTrigger className="rounded-xl focus:ring-primary/30">
                    <SelectValue placeholder="모델 선택" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {getModels(config.chat_provider ?? 'server').map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span>{m.name}</span>
                        {m.description && (
                          <span className="ml-2 text-muted-foreground text-[11px]">
                            {m.description}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
