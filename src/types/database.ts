// =============================================================================
// Database types aligned with SQL schema (001_initial_schema.sql)
// =============================================================================

// Re-export Database type from auto-generated file (supabase gen types)
export type { Database } from './database-generated';

export type UserRole = 'user' | 'admin';
export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paused';
export type ClipPlatform =
  | 'web' | 'twitter' | 'youtube' | 'github'
  | 'medium' | 'substack' | 'reddit' | 'linkedin'
  | 'instagram' | 'tiktok' | 'threads' | 'naver' | 'pinterest' | 'image' | 'other';

export type ClipSourceType = 'url' | 'image_upload';

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  auth_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  language: string;
  theme: string;
  plan: string;
  role: string;
  openai_api_key: string | null;
  google_ai_key: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Collections ─────────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Image Albums ───────────────────────────────────────────────────────────

export interface ImageAlbum {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  cover_image: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Clips ───────────────────────────────────────────────────────────────────

export type ClipProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface ClipData {
  id: string;
  user_id: string;
  url: string;
  source_type: ClipSourceType;
  title: string | null;
  summary: string | null;
  image: string | null;
  platform: ClipPlatform | null;
  author: string | null;
  author_handle: string | null;
  author_avatar: string | null;
  read_time: number | null;
  ai_score: number | null;
  is_favorite: boolean;
  is_read: boolean;
  is_read_later: boolean;
  is_archived: boolean;
  is_hidden: boolean;
  is_pinned?: boolean;            // DB migration pending — column not yet in production
  is_public: boolean;
  share_token?: string | null;   // DB migration pending — column not yet in production
  category_id: string | null;
  views: number;
  likes_count: number;
  remind_at: string | null;
  processing_status: ClipProcessingStatus;
  notes: string | null;
  processing_error: string | null;
  retry_count: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Clip Content ────────────────────────────────────────────────────────────

export interface ClipContent {
  clip_id: string;
  html_content: string | null;
  content_markdown: string | null;
  raw_markdown: string | null;
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  lemon_squeezy_id: string | null;
  trial_start_date: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Credits ─────────────────────────────────────────────────────────────────

export interface Credits {
  user_id: string;
  monthly_used: number;
  monthly_limit: number;
  reset_date: string;
  created_at: string;
  updated_at: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  actor_id: string | null;
  clip_id: string | null;
  message: string | null;
  is_read: boolean;
  timestamp: string;
}

// ─── Clip Annotations ────────────────────────────────────────────────────────

export interface ClipAnnotation {
  id: string;
  clip_id: string;
  user_id: string;
  type: string;
  selected_text: string | null;
  note_text: string | null;
  position_data: Record<string, unknown> | null;
  color: string;
  timestamp: string;
  /** Alias for timestamp — used throughout the codebase */
  created_at: string;
}

// ─── Clip Images ────────────────────────────────────────────────────────────

export interface ClipImage {
  id: string;
  clip_id: string;
  storage_path: string;
  public_url: string | null;
  original_filename: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  mime_type: string | null;
  ocr_text: string | null;
  structured_data: Record<string, unknown> | null;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
}

// ─── OAuth Connections ───────────────────────────────────────────────────────

export type OAuthProvider = 'threads' | 'youtube';

export interface OAuthConnection {
  id: string;
  user_id: string;
  provider: OAuthProvider;
  provider_user_id: string;
  provider_username: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
  connected_at: string;
  updated_at: string;
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  timestamp: string;
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string | null;
  is_active: boolean;
  timestamp: string;
}

// ─── Reading Progress ────────────────────────────────────────────────────────

export interface ReadingProgress {
  clip_id: string;
  user_id: string;
  scroll_percentage: number;
  time_spent_seconds: number;
  completed_at: string | null;
  last_read_at: string;
}

