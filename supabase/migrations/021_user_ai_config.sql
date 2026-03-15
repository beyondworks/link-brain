-- 021: User AI Model Configuration
CREATE TABLE public.user_ai_config (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  default_provider TEXT NOT NULL DEFAULT 'server' CHECK (default_provider IN ('server', 'openai', 'google', 'anthropic')),
  default_model TEXT,
  chat_provider TEXT CHECK (chat_provider IN ('server', 'openai', 'google', 'anthropic')),
  chat_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own ai config" ON public.user_ai_config
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));
