export type UserRole = 'free' | 'pro' | 'team' | 'enterprise';
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete';
export type ClipPlatform =
  | 'twitter'
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'github'
  | 'web'
  | 'other';
export type ContentType =
  | 'article'
  | 'video'
  | 'image'
  | 'audio'
  | 'document'
  | 'social_post'
  | 'other';
export type ProcessingStatus = 'pending' | 'processing' | 'done' | 'failed';

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  clip_count: number;
  storage_used_bytes: number;
  created_at: string;
  updated_at: string;
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: UserRole;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Credits ─────────────────────────────────────────────────────────────────

export interface Credits {
  id: string;
  user_id: string;
  balance: number;
  lifetime_earned: number;
  created_at: string;
  updated_at: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  clip_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Collections ─────────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  clip_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  usage_count: number;
  created_at: string;
}

// ─── Clips ───────────────────────────────────────────────────────────────────

export interface ClipData {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  favicon_url: string | null;
  platform: ClipPlatform;
  content_type: ContentType;
  category_id: string | null;
  collection_id: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_public: boolean;
  view_count: number;
  processing_status: ProcessingStatus;
  created_at: string;
  updated_at: string;
  // Relations (optionally joined)
  category?: Category | null;
  collection?: Collection | null;
  tags?: Tag[];
  content?: ClipContent | null;
}

// ─── Clip Content ─────────────────────────────────────────────────────────────

export interface ClipContent {
  id: string;
  clip_id: string;
  raw_text: string | null;
  summary: string | null;
  key_points: string[] | null;
  ai_tags: string[] | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  reading_time_minutes: number | null;
  language: string | null;
  word_count: number | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

// ─── Supabase Database shape ──────────────────────────────────────────────────
// Minimal shape — will be replaced by `supabase gen types` output.

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'updated_at' | 'clip_count' | 'storage_used_bytes'> &
          Partial<Pick<User, 'clip_count' | 'storage_used_bytes'>>;
        Update: Partial<Omit<User, 'id'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subscription, 'id'>>;
      };
      credits: {
        Row: Credits;
        Insert: Omit<Credits, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Credits, 'id'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'clip_count'>;
        Update: Partial<Omit<Category, 'id'>>;
      };
      collections: {
        Row: Collection;
        Insert: Omit<Collection, 'id' | 'created_at' | 'updated_at' | 'clip_count'>;
        Update: Partial<Omit<Collection, 'id'>>;
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, 'id' | 'created_at' | 'usage_count'>;
        Update: Partial<Omit<Tag, 'id'>>;
      };
      clips: {
        Row: ClipData;
        Insert: Omit<ClipData, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'category' | 'collection' | 'tags' | 'content'>;
        Update: Partial<Omit<ClipData, 'id' | 'category' | 'collection' | 'tags' | 'content'>>;
      };
      clip_contents: {
        Row: ClipContent;
        Insert: Omit<ClipContent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ClipContent, 'id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      subscription_status: SubscriptionStatus;
      clip_platform: ClipPlatform;
      content_type: ContentType;
      processing_status: ProcessingStatus;
    };
  };
}
