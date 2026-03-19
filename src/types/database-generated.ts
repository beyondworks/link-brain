export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string | null
          timestamp: string
          title: string
          type: string
        }
        Insert: {
          content: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          timestamp?: string
          title: string
          type?: string
        }
        Update: {
          content?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          timestamp?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          timestamp: string
          user_id: string
        }
        Insert: {
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          timestamp?: string
          user_id: string
        }
        Update: {
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_annotations: {
        Row: {
          clip_id: string
          color: string
          id: string
          note_text: string | null
          position_data: Json | null
          selected_text: string | null
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          clip_id: string
          color?: string
          id?: string
          note_text?: string | null
          position_data?: Json | null
          selected_text?: string | null
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          clip_id?: string
          color?: string
          id?: string
          note_text?: string | null
          position_data?: Json | null
          selected_text?: string | null
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_annotations_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_annotations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_chats: {
        Row: {
          clip_id: string
          content: string
          id: string
          role: string
          timestamp: string
        }
        Insert: {
          clip_id: string
          content: string
          id?: string
          role: string
          timestamp?: string
        }
        Update: {
          clip_id?: string
          content?: string
          id?: string
          role?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_chats_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_collections: {
        Row: {
          clip_id: string
          collection_id: string
        }
        Insert: {
          clip_id: string
          collection_id: string
        }
        Update: {
          clip_id?: string
          collection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_collections_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_contents: {
        Row: {
          clip_id: string
          content_markdown: string | null
          html_content: string | null
          raw_markdown: string | null
        }
        Insert: {
          clip_id: string
          content_markdown?: string | null
          html_content?: string | null
          raw_markdown?: string | null
        }
        Update: {
          clip_id?: string
          content_markdown?: string | null
          html_content?: string | null
          raw_markdown?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clip_contents_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: true
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_embeddings: {
        Row: {
          clip_id: string
          content_hash: string | null
          created_at: string
          embedding: string
          embedding_model: string
          user_id: string | null
        }
        Insert: {
          clip_id: string
          content_hash?: string | null
          created_at?: string
          embedding: string
          embedding_model?: string
          user_id?: string | null
        }
        Update: {
          clip_id?: string
          content_hash?: string | null
          created_at?: string
          embedding?: string
          embedding_model?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clip_embeddings_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: true
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_embeddings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_images: {
        Row: {
          clip_id: string
          created_at: string
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          ocr_text: string | null
          original_filename: string | null
          pdf_storage_path: string | null
          public_url: string | null
          storage_path: string
          structured_data: Json | null
          updated_at: string
          width: number | null
        }
        Insert: {
          clip_id: string
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          ocr_text?: string | null
          original_filename?: string | null
          pdf_storage_path?: string | null
          public_url?: string | null
          storage_path: string
          structured_data?: Json | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          clip_id?: string
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          ocr_text?: string | null
          original_filename?: string | null
          pdf_storage_path?: string | null
          public_url?: string | null
          storage_path?: string
          structured_data?: Json | null
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clip_images_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_tags: {
        Row: {
          clip_id: string
          tag_id: string
        }
        Insert: {
          clip_id: string
          tag_id: string
        }
        Update: {
          clip_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_tags_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      clips: {
        Row: {
          ai_score: number | null
          author: string | null
          author_avatar: string | null
          author_handle: string | null
          category_id: string | null
          created_at: string
          fts: unknown
          id: string
          image: string | null
          is_archived: boolean
          is_favorite: boolean
          is_hidden: boolean
          is_public: boolean
          is_read: boolean
          is_read_later: boolean
          likes_count: number
          notes: string | null
          platform: string | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          read_time: number | null
          remind_at: string | null
          retry_count: number
          source_type: string
          summary: string | null
          title: string | null
          updated_at: string
          url: string
          user_id: string
          views: number
        }
        Insert: {
          ai_score?: number | null
          author?: string | null
          author_avatar?: string | null
          author_handle?: string | null
          category_id?: string | null
          created_at?: string
          fts?: unknown
          id?: string
          image?: string | null
          is_archived?: boolean
          is_favorite?: boolean
          is_hidden?: boolean
          is_public?: boolean
          is_read?: boolean
          is_read_later?: boolean
          likes_count?: number
          notes?: string | null
          platform?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          read_time?: number | null
          remind_at?: string | null
          retry_count?: number
          source_type?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
          url: string
          user_id: string
          views?: number
        }
        Update: {
          ai_score?: number | null
          author?: string | null
          author_avatar?: string | null
          author_handle?: string | null
          category_id?: string | null
          created_at?: string
          fts?: unknown
          id?: string
          image?: string | null
          is_archived?: boolean
          is_favorite?: boolean
          is_hidden?: boolean
          is_public?: boolean
          is_read?: boolean
          is_read_later?: boolean
          likes_count?: number
          notes?: string | null
          platform?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          read_time?: number | null
          remind_at?: string | null
          retry_count?: number
          source_type?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
          url?: string
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "clips_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_usage: {
        Row: {
          action: string
          clip_id: string | null
          cost: number
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          clip_id?: string | null
          cost?: number
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          clip_id?: string | null
          cost?: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_usage_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          created_at: string
          monthly_limit: number
          monthly_used: number
          reset_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          monthly_limit?: number
          monthly_used?: number
          reset_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          monthly_limit?: number
          monthly_used?: number
          reset_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          timestamp: string
        }
        Insert: {
          follower_id: string
          following_id: string
          timestamp?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      image_album_clips: {
        Row: {
          added_at: string
          album_id: string
          clip_id: string
        }
        Insert: {
          added_at?: string
          album_id: string
          clip_id: string
        }
        Update: {
          added_at?: string
          album_id?: string
          clip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_album_clips_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "image_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_album_clips_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      image_albums: {
        Row: {
          color: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          clip_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          clip_id: string
          timestamp?: string
          user_id: string
        }
        Update: {
          clip_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          clip_references: string[] | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          clip_references?: string[] | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          clip_references?: string[] | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          clip_id: string | null
          id: string
          is_read: boolean
          message: string | null
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          clip_id?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          clip_id?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_connections: {
        Row: {
          access_token: string
          connected_at: string | null
          id: string
          provider: string
          provider_user_id: string
          provider_username: string | null
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          id?: string
          provider: string
          provider_user_id: string
          provider_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          id?: string
          provider?: string
          provider_user_id?: string
          provider_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          clip_id: string
          completed_at: string | null
          last_read_at: string
          scroll_percentage: number
          time_spent_seconds: number
          user_id: string
        }
        Insert: {
          clip_id: string
          completed_at?: string | null
          last_read_at?: string
          scroll_percentage?: number
          time_spent_seconds?: number
          user_id: string
        }
        Update: {
          clip_id?: string
          completed_at?: string | null
          last_read_at?: string
          scroll_percentage?: number
          time_spent_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_generations: {
        Row: {
          content_type: string
          created_at: string
          id: string
          length: string
          output: string
          source_clip_ids: string[]
          tone: string
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          id?: string
          length?: string
          output: string
          source_clip_ids?: string[]
          tone?: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          id?: string
          length?: string
          output?: string
          source_clip_ids?: string[]
          tone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          lemon_squeezy_id: string | null
          status: string
          tier: string
          trial_start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          lemon_squeezy_id?: string | null
          status?: string
          tier?: string
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          lemon_squeezy_id?: string | null
          status?: string
          tier?: string
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_usage_stats: {
        Row: {
          tag_id: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          tag_id: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          tag_id?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tag_usage_stats_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: true
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_ai_config: {
        Row: {
          chat_model: string | null
          chat_provider: string | null
          created_at: string | null
          default_model: string | null
          default_provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_model?: string | null
          chat_provider?: string | null
          created_at?: string | null
          default_model?: string | null
          default_provider?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_model?: string | null
          chat_provider?: string | null
          created_at?: string | null
          default_model?: string | null
          default_provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_config_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_keys: {
        Row: {
          created_at: string
          encrypted_api_key: string
          id: string
          is_active: boolean
          key_prefix: string
          last_used_at: string | null
          name: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_api_key: string
          id?: string
          is_active?: boolean
          key_prefix: string
          last_used_at?: string | null
          name: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_api_key?: string
          id?: string
          is_active?: boolean
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string
          google_ai_key: string | null
          id: string
          language: string
          openai_api_key: string | null
          plan: string
          role: string
          theme: string
          updated_at: string
        }
        Insert: {
          auth_id: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          google_ai_key?: string | null
          id?: string
          language?: string
          openai_api_key?: string | null
          plan?: string
          role?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          auth_id?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          google_ai_key?: string | null
          id?: string
          language?: string
          openai_api_key?: string | null
          plan?: string
          role?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          events: string[]
          id: string
          is_active: boolean
          secret: string | null
          timestamp: string
          url: string
          user_id: string
        }
        Insert: {
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string | null
          timestamp?: string
          url: string
          user_id: string
        }
        Update: {
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string | null
          timestamp?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      monthly_credit_summary: {
        Row: {
          action: string | null
          month: string | null
          total_cost: number | null
          usage_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      deduct_credit:
        | {
            Args: {
              p_action: string
              p_clip_id?: string
              p_cost?: number
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_action: string
              p_clip_id?: string
              p_cost?: number
              p_monthly_limit?: number
              p_user_id: string
            }
            Returns: Json
          }
      find_related_clips: {
        Args: {
          p_clip_id: string
          p_match_count?: number
          p_restrict_to_user?: boolean
        }
        Returns: {
          clip_id: string
          similarity: number
          summary: string
          title: string
          url: string
        }[]
      }
      get_nav_counts: { Args: { p_user_id: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      match_clips: {
        Args: {
          p_embedding: string
          p_match_count?: number
          p_match_threshold?: number
          p_user_id: string
        }
        Returns: {
          clip_id: string
          similarity: number
        }[]
      }
      omni_search: {
        Args: { p_match_count?: number; p_query: string; p_user_id: string }
        Returns: {
          entity_id: string
          entity_type: string
          label: string
          score: number
          sub_label: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      smart_search: {
        Args: {
          p_embedding?: string
          p_include_public?: boolean
          p_match_count?: number
          p_query: string
          p_user_id: string
        }
        Returns: {
          clip_id: string
          combined_score: number
          fts_rank: number
          platform: string
          semantic_score: number
          summary: string
          title: string
          trgm_score: number
          url: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
