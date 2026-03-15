-- 019: Embeddings (pgvector) + Conversations for RAG chat
-- Dependencies: 001 (clips, users tables)

-- ─── pgvector 활성화 ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ─── clip_embeddings 테이블 ─────────────────────────────────────────────────
CREATE TABLE public.clip_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  embedding vector(1536),
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clip_id)
);

-- HNSW 인덱스 (cosine similarity)
CREATE INDEX idx_clip_embeddings_vector ON public.clip_embeddings
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_clip_embeddings_user ON public.clip_embeddings(user_id);

-- RLS
ALTER TABLE public.clip_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own embeddings" ON public.clip_embeddings
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- ─── 유사도 검색 RPC ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_clips(
  p_user_id UUID,
  p_embedding vector(1536),
  p_match_count INT DEFAULT 10,
  p_match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (clip_id UUID, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT ce.clip_id, 1 - (ce.embedding <=> p_embedding) AS similarity
  FROM public.clip_embeddings ce
  WHERE ce.user_id = p_user_id
    AND 1 - (ce.embedding <=> p_embedding) > p_match_threshold
  ORDER BY ce.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;

-- ─── conversations 테이블 ───────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON public.conversations(user_id);

-- ─── messages 테이블 ────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  clip_references UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own conversations" ON public.conversations
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users own messages" ON public.messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );
