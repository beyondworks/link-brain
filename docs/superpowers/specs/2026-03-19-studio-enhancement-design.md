# Studio Enhancement Design Spec

> Date: 2026-03-19
> Status: Approved

## Features

### 1+2. Studio Clip Picker Modal + Preview
- Full-screen modal with search + category/platform filter + clip list + preview panel
- Desktop: left 60% (list) / right 40% (preview). Mobile: full-screen + sub-modal preview
- pendingSelection pattern for cancel safety
- Files: studio-clip-picker-dialog.tsx, studio-clip-picker-item.tsx, studio-clip-preview.tsx
- Backend: No changes (reuse useClips({ search, filters }))

### 3. Collective Learning RAG System (B+C Level)
- Layer 1: Base guides in src/lib/ai/guides/*.md (static patterns from top content)
- Layer 2: Collective patterns from all user clips (content_patterns table + embedding similarity)
- Injection: generate.ts loadGuide() + collectivePatterns() → system prompt
- Token budget: ~1000 tokens total (guide 500 + patterns 500)

### 4. AI Chat Write Tools (propose_action + confirm)
- New tool: propose_action (plan only, no execution)
- New handler: confirm (execute approved plan)
- Supported: move_to_category, add_to_collection, archive, favorite, hide_category
- Excluded: delete (intentional)
- Client: confirmation card UI in chat-panel.tsx
- Migration: categories.is_hidden boolean

## Implementation Priority
1. Base RAG guides (low effort)
2. Studio modal picker (medium effort)
3. AI chat write tools (medium effort)
4. Collective learning pipeline (high effort)
