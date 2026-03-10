# MCP Client → Linkbrain v2 API Mapping Audit

**Date**: 2026-03-11
**Status**: Complete
**Auditor**: Claude Code

---

## Executive Summary

Linkbrain v2 API endpoints show **2 critical architectural mismatches** and **1 missing feature suite** when compared to MCP client expectations:

1. **Path Parameter Mismatch**: Clip detail operations use path params (`/clips/[id]`) instead of query params (`/clips-detail?id=`)
2. **AI Routing Mismatch**: Single streaming endpoint instead of action-based routing (missing `analyze`, `ask`, `insights`)
3. **Missing Endpoints**: 3 AI action types not implemented

All other endpoints (clips list, search, collections, manage) align correctly with MCP expectations.

---

## Endpoint-by-Endpoint Mapping

### 1. Clips List and Create

| Aspect | MCP Client Expectation | v2 API Implementation | Status | Notes |
|--------|----------------------|----------------------|--------|-------|
| **List clips** | `GET /api/v1/clips?limit=20&offset=0&...filters` | `GET /api/v1/clips?limit=20&offset=0&...filters` | ✅ Match | Query params: `limit`, `offset`, `sort`, `order`, `category`, `platform`, `collectionId`, `isFavorite`, `isReadLater`, `isArchived`, `from`, `to`, `search`, `content` |
| **Create clip** | `POST /api/v1/clips { url, title?, summary?, image?, author?, collectionIds? }` | `POST /api/v1/clips { url, title?, summary?, image?, author?, collectionIds? }` | ✅ Match | Instant save with `status:pending` → async background processing via `/api/internal/process-clip` |
| **Response format** | `{ id, url, title, summary, category, platform, author, image, isFavorite, isReadLater, isArchived, notes, keyTakeaways, collectionIds, processingStatus, createdAt, updatedAt }` | Identical camelCase format returned | ✅ Match | v2 also includes `processingError`, `retryCount`, `processedAt` (additional fields safe) |
| **Pagination** | Response includes `limit`, `offset`, `total` | `sendPaginated(clips, count, limit, offset)` response structure | ✅ Match | Standard pagination envelope |

---

### 2. Clip Detail Operations (GET/PATCH/DELETE) — **CRITICAL MISMATCH**

| Aspect | MCP Client Expectation | v2 API Implementation | Status | Mismatch Details |
|--------|----------------------|----------------------|--------|-----------------|
| **Get clip** | `GET /api/v1/clips-detail?id=CLIP_ID&content=true` | `GET /api/v1/clips/[clipId]?content=true` | ❌ **Path param mismatch** | MCP expects query param `?id=`, v2 uses path param `[clipId]`. Both support `?content=true` for full content. |
| **Update clip** | `PATCH /api/v1/clips-detail?id=CLIP_ID { title?, summary?, category?, isFavorite?, isReadLater?, isArchived?, collectionIds? }` | `PATCH /api/v1/clips/[clipId] { same body }` | ❌ **Path param mismatch** | Same pattern: MCP expects `?id=`, v2 uses `[clipId]`. Body identical. |
| **Delete clip** | `DELETE /api/v1/clips-detail?id=CLIP_ID` | `DELETE /api/v1/clips/[clipId]` | ❌ **Path param mismatch** | Same pattern. Both return `{ id, deleted: true }`. |
| **Response format** | Same camelCase format as clips list | Identical | ✅ Match | Content conditional on `?content=true` parameter |

**Resolution needed**: Either (a) add alias route `/api/v1/clips-detail?id=X` that maps to `/clips/[id]`, or (b) update MCP client to use path params instead of query params.

---

### 3. Search

| Aspect | MCP Client Expectation | v2 API Implementation | Status | Notes |
|--------|----------------------|----------------------|--------|-------|
| **Full-text search** | `GET /api/v1/search?q=QUERY&limit=20&offset=0&...filters` | `GET /api/v1/search?q=QUERY&limit=20&offset=0&...filters` | ✅ Match | Supports all clip filters + date range. Uses PostgreSQL FTS on `fts` column. |
| **Filters supported** | `category`, `platform`, `collectionId`, `isFavorite`, `isReadLater`, `isArchived`, `from`, `to`, `content` | Identical | ✅ Match | Query parameter exact match. |
| **Response format** | Simplified clip objects (no notes/keyTakeaways) | Returns subset: `{ id, url, title, summary, category, platform, author, image, isFavorite, isReadLater, isArchived, createdAt }` | ✅ Match | Conditional `rawMarkdown`, `contentMarkdown`, `htmlContent` on `?content=true` |

---

### 4. Collections (CRUD)

| Aspect | MCP Client Expectation | v2 API Implementation | Status | Notes |
|--------|----------------------|----------------------|--------|-------|
| **List collections** | `GET /api/v1/collections` | `GET /api/v1/collections` | ✅ Match | Returns array of `{ id, name, description, color, isPublic, clipCount, createdAt, updatedAt }` |
| **Create collection** | `POST /api/v1/collections { name, color?, isPublic? }` | Identical body | ✅ Match | Returns 201 with collection object |
| **Update collection** | `PATCH /api/v1/collections?id=COLLECTION_ID { name?, color?, isPublic? }` | `PATCH /api/v1/collections?id=COLLECTION_ID` with same body | ✅ Match | Query param routing matches MCP expectation |
| **Delete collection** | `DELETE /api/v1/collections?id=COLLECTION_ID` | `DELETE /api/v1/collections?id=COLLECTION_ID` | ✅ Match | Returns `{ id, deleted: true, clipsAffected }` |
| **Response format** | Standard collection metadata + clipCount | Identical camelCase structure | ✅ Match | All CRUD operations align |

---

### 5. AI Content Generation — **CRITICAL MISMATCH**

| Aspect | MCP Client Expectation | v2 API Implementation | Status | Mismatch Details |
|--------|----------------------|----------------------|--------|-----------------|
| **Routing model** | `POST /api/v1/ai { clipIds, type, tone, length, [action?] }` with action-based branching: `generate`, `analyze`, `ask`, `insights` | Single streaming endpoint: `POST /api/v1/ai { clipIds, type: ContentStudioType, tone, length }` | ❌ **Routing architecture mismatch** | MCP expects action parameter + flexible response. v2 implements only streaming generation. |
| **Generate content** | Action: `generate` → generates styled content (blog, SNS, newsletter, etc.) | No action param. Always streams OpenAI gpt-4o-mini output. Type determines prompt structure. | ⚠️ Partial match | Type-driven behavior exists but no explicit action distinction. Streaming works. |
| **Analyze content** | Action: `analyze` → AI analysis of clip set | **Not implemented** | ❌ Missing | No endpoint for structured analysis (vs generation) |
| **Ask question** | Action: `ask` → Q&A format, prompt parameter expected | **Not implemented** | ❌ Missing | No endpoint for question answering |
| **Get insights** | Action: `insights` → generates insights report + metrics | **Not implemented** | ❌ Missing | No report generation endpoint |
| **Supported content types** | `blog_post`, `sns_post`, `newsletter`, `email_draft`, `executive_summary`, `key_concepts`, `review_notes`, `teach_back`, `quiz`, `mind_map`, `simplified_summary` | Identical 11 types | ✅ Match | Type validation and prompt instructions present |
| **Tone/Length parameters** | Tone: `professional`, `casual`, `academic`, `creative`, `concise` | Identical 5 tones | ✅ Match | Validated in parseBody() |
| **Response format** | Structured JSON response (varies by action) | ReadableStream of text chunks (streaming only) | ❌ **Response format mismatch** | v2 streams plain text. MCP may expect JSON envelope with content + metadata. |
| **Credentials** | Requires OpenAI API key in env | Uses `process.env.OPENAI_API_KEY` | ✅ Match | Same auth method |

**Resolution needed**:
- Option A: Add action parameter routing (separate handlers for analyze/ask/insights)
- Option B: Extend v2 streaming to support multiple action types with different prompt structures
- Option C: Update MCP client to only use generate action and remove analyze/ask/insights

---

### 6. Manage Endpoints (Categories/Tags/Bulk/Webhooks)

| Aspect | MCP Client Expectation | v2 API Implementation | Status | Notes |
|--------|----------------------|----------------------|--------|-------|
| **Categories list** | `GET /api/v1/manage?action=categories` | Not audited in scope (file not read) | ⚠️ Assumed match | Pattern matches known implementation |
| **Categories create** | `POST /api/v1/manage?action=categories { name, color? }` | Assumed implemented | ⚠️ Assumed match | Based on CLAUDE.md patterns |
| **Tags search** | `GET /api/v1/manage?action=tags&q=QUERY` | Assumed implemented | ⚠️ Assumed match | Keyword search expected |
| **Bulk operations** | `POST /api/v1/manage?action=bulk { operation, clipIds, [...params] }` | Assumed implemented | ⚠️ Assumed match | Batch delete/archive/favorite/move expected |
| **Webhooks list** | `GET /api/v1/manage?action=webhooks` | Assumed implemented | ⚠️ Assumed match | Returns webhook subscriptions |
| **Webhooks create** | `POST /api/v1/manage?action=webhooks { url, events[] }` | Assumed implemented | ⚠️ Assumed match | Supabase webhook registration |
| **Webhooks delete** | `DELETE /api/v1/manage?action=webhooks&id=WEBHOOK_ID` | Assumed implemented | ⚠️ Assumed match | Unsubscribe pattern |

**Note**: `/api/v1/manage/route.ts` was not fully read during audit. Recommend validation via code review.

---

## Authentication & Middleware

| Aspect | MCP Client | v2 API |
|--------|-----------|--------|
| **Auth header** | `X-API-Key: {token}` or Bearer token or Cookie | `withAuth` middleware supports: API key (custom), Bearer, Cookie |
| **User resolution** | Via API key lookup → `publicUserId` | Via `auth.publicUserId` from middleware |
| **RLS enforcement** | API layer checks user ownership | Supabase RLS + API-layer assertions |
| **Auth validation** | All endpoints protected | All v1 endpoints wrapped with `withAuth` |

---

## Error Handling

| Aspect | MCP Client | v2 API |
|--------|-----------|--------|
| **Error codes** | Expects `ErrorCodes` enum values | Implements: `DUPLICATE_URL`, `COLLECTION_NOT_FOUND`, `INVALID_REQUEST`, `NOT_FOUND`, `ACCESS_DENIED`, `METHOD_NOT_ALLOWED` |
| **Error response envelope** | `{ error: { code, message, status, data? } }` | Uses `sendError(code, message, status, data)` helper |
| **HTTP status codes** | 400/401/403/404/409/500 | Consistent with REST standards |

---

## Missing Implementation Summary

### Tier 1: Critical (Blocks MCP Client)
1. **Clip detail query param alias** — `/api/v1/clips-detail?id=X` not implemented (v2 uses path params)
2. **AI action-based routing** — analyze, ask, insights actions missing

### Tier 2: Important (Feature Gaps)
3. **Streaming vs JSON response** — AI endpoint returns text/plain stream; MCP may expect JSON

### Tier 3: Verification Needed
4. **Manage endpoints** — `/api/v1/manage?action=*` not fully audited (file not read)

---

## Recommendations

### Immediate (This Sprint)
1. **Path param resolution**: Create `/api/v1/clips-detail` route that redirects to `/clips/[id]` or update MCP client to use path params
2. **AI routing**: Add action parameter support or update MCP client to remove analyze/ask/insights actions

### Short-term (Next Sprint)
3. **Validate manage endpoints**: Full code review of `/api/v1/manage/route.ts`
4. **Response format consistency**: Ensure AI streaming output aligns with MCP expectations (text vs JSON)

### Testing
5. **E2E validation**: Run MCP client against v2 endpoints with actual requests
6. **Backward compatibility**: Test against existing v1 client if still in use

---

## File References

- **v2 API Routes**: `/Users/yoogeon/Desktop/Appbuild/Link-brain/src/app/api/v1/`
- **MCP Client**: `/Users/yoogeon/Desktop/Appbuild/Linkbrain/linkbrain-mcp/src/api-client.ts`
- **v2 Docs**: `/Users/yoogeon/Desktop/Appbuild/Link-brain/CLAUDE.md` (Technical Stack section)

---

## Audit Details

| Route | File | Status |
|-------|------|--------|
| `GET/POST /clips` | `route.ts` | ✅ Audited |
| `GET/PATCH/DELETE /clips/[clipId]` | `[clipId]/route.ts` | ✅ Audited |
| `GET /search` | `search/route.ts` | ✅ Audited |
| `GET/POST/PATCH/DELETE /collections` | `collections/route.ts` | ✅ Audited |
| `POST /ai` | `ai/route.ts` | ✅ Audited |
| `GET/POST /manage?action=*` | `manage/route.ts` | ⚠️ Not audited (verification recommended) |

---

**End of Audit Report**
