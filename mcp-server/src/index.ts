#!/usr/bin/env node
/**
 * Linkbrain MCP Server v2
 *
 * Provides 23 tools for Claude to interact with Linkbrain's Second Brain API.
 * Transport: stdio
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { LinkbrainClient } from './api-client.js';

// ── Config ────────────────────────────────────────

const API_KEY = process.env.LINKBRAIN_API_KEY;
const API_URL = process.env.LINKBRAIN_API_URL || 'https://linkbrain.cloud';

if (!API_KEY) {
    console.error('LINKBRAIN_API_KEY environment variable is required.');
    console.error('Get your API key from: https://linkbrain.cloud/settings?tab=api');
    process.exit(1);
}

const client = new LinkbrainClient({ apiKey: API_KEY, baseUrl: API_URL });

// ── Helper ────────────────────────────────────────

function jsonResponse(data: unknown) {
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

async function safeCall<T>(fn: () => Promise<T>) {
    try {
        const result = await fn();
        return jsonResponse(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true as const };
    }
}

// ── Server ────────────────────────────────────────

const server = new McpServer({
    name: 'linkbrain',
    version: '2.0.0',
});

// ── Clips Tools ───────────────────────────────────

server.tool(
    'list_clips',
    'List saved clips with optional filters. Supports category, platform, collection, favorites, read-later, archived, date range, text search, pagination, and sorting. Use includeContent=true to get the full original text (rawMarkdown) of each clip in the response.',
    {
        category: z.string().optional().describe('Filter by category (e.g., "AI", "Design")'),
        platform: z.string().optional().describe('Filter by platform (e.g., "youtube", "twitter")'),
        collectionId: z.string().optional().describe('Filter by collection ID'),
        isFavorite: z.boolean().optional().describe('Filter favorites only'),
        isReadLater: z.boolean().optional().describe('Filter read-later only'),
        isArchived: z.boolean().optional().describe('Filter archived only'),
        from: z.string().optional().describe('Start date (ISO-8601, e.g., "2025-01-01")'),
        to: z.string().optional().describe('End date (ISO-8601, e.g., "2025-12-31")'),
        search: z.string().optional().describe('Text search across title, summary, keywords'),
        limit: z.number().min(1).max(100).optional().describe('Number of results (default 20, max 100)'),
        offset: z.number().min(0).optional().describe('Pagination offset'),
        sort: z.string().optional().describe('Sort field (e.g., "createdAt", "title")'),
        order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
        includeContent: z.boolean().optional().describe('Include full original content (rawMarkdown, contentMarkdown, htmlContent) in response. Default false.'),
    },
    async (params) => safeCall(() => client.listClips(params))
);

server.tool(
    'get_clip',
    'Get detailed information about a specific clip (title, URL, summary, keywords, notes, category, processing status, etc.).',
    {
        id: z.string().describe('Clip ID'),
    },
    async ({ id }) => safeCall(() => client.getClip(id))
);

server.tool(
    'get_clip_content',
    'Get the full original content of a clip (the complete text extracted from the source URL, in markdown/HTML format).',
    {
        id: z.string().describe('Clip ID'),
    },
    async ({ id }) => safeCall(() => client.getClipContent(id))
);

server.tool(
    'search_clips',
    'Search clips by keyword query using full-text search. Searches across titles, summaries, and content. Supports filters. Use includeContent=true to get the full original text (rawMarkdown) of each clip.',
    {
        q: z.string().describe('Search query'),
        category: z.string().optional().describe('Filter by category'),
        platform: z.string().optional().describe('Filter by platform'),
        collectionId: z.string().optional().describe('Filter by collection ID'),
        isFavorite: z.boolean().optional().describe('Filter favorites only'),
        isReadLater: z.boolean().optional().describe('Filter read-later only'),
        isArchived: z.boolean().optional().describe('Filter archived only'),
        from: z.string().optional().describe('Start date (ISO-8601)'),
        to: z.string().optional().describe('End date (ISO-8601)'),
        limit: z.number().min(1).max(50).optional().describe('Number of results (default 20)'),
        offset: z.number().min(0).optional().describe('Pagination offset'),
        includeContent: z.boolean().optional().describe('Include full original content (rawMarkdown, contentMarkdown, htmlContent) in response. Default false.'),
    },
    async ({ q, ...params }) => safeCall(() => client.searchClips(q, params))
);

server.tool(
    'create_clip',
    'Save a new clip (bookmark) from a URL. The URL is automatically analyzed in the background to extract title, summary, keywords, and category. Returns immediately with processingStatus="pending". You can optionally provide title/summary to skip auto-extraction.',
    {
        url: z.string().url().describe('URL to save'),
        title: z.string().optional().describe('Custom title (auto-extracted if omitted)'),
        summary: z.string().optional().describe('Custom summary'),
        category: z.string().optional().describe('Category name'),
        keywords: z.array(z.string()).optional().describe('Keywords/tags'),
        notes: z.string().optional().describe('Personal notes'),
        collectionIds: z.array(z.string()).optional().describe('Collection IDs to add to'),
    },
    async (params) => safeCall(() => client.createClip(params))
);

server.tool(
    'update_clip',
    'Update a clip\'s metadata (title, summary, notes, category, keywords, collections, favorite/read-later/archived status, etc.).',
    {
        id: z.string().describe('Clip ID'),
        title: z.string().optional().describe('New title'),
        summary: z.string().optional().describe('New summary'),
        notes: z.string().optional().describe('New notes'),
        keyTakeaways: z.string().optional().describe('New key takeaways'),
        category: z.string().optional().describe('New category'),
        keywords: z.array(z.string()).optional().describe('New keywords'),
        collectionIds: z.array(z.string()).optional().describe('New collection IDs'),
        isFavorite: z.boolean().optional().describe('Set favorite status'),
        isReadLater: z.boolean().optional().describe('Set read-later status'),
        isArchived: z.boolean().optional().describe('Set archived status'),
    },
    async ({ id, ...data }) => safeCall(() => client.updateClip(id, data))
);

server.tool(
    'delete_clip',
    'Permanently delete a clip. Also removes it from any collections.',
    {
        id: z.string().describe('Clip ID to delete'),
    },
    async ({ id }) => safeCall(() => client.deleteClip(id))
);

// ── AI Tools ──────────────────────────────────────

server.tool(
    'generate_content',
    'Generate content from clips using AI. Available types: report, planning, trend, big-picture, step-by-step, chapter-lessons, simplify, key-concepts, quiz, visual-map, review-notes, teach-back, sns-post, newsletter, presentation, email-draft, blog-post, executive-summary. Consumes credits.',
    {
        type: z.string().describe('Content type (e.g., "blog-post", "report", "newsletter", "sns-post", "quiz")'),
        clipIds: z.array(z.string()).min(1).describe('Clip IDs to use as source material'),
        language: z.enum(['ko', 'en']).optional().describe('Output language (default: ko)'),
    },
    async (params) => safeCall(() => client.generateContent(params))
);

server.tool(
    'analyze_url',
    'Analyze a URL using AI. Extracts title, summary, keywords, category, and other metadata. Consumes credits.',
    {
        url: z.string().url().describe('URL to analyze'),
    },
    async ({ url }) => safeCall(() => client.analyzeUrl(url))
);

server.tool(
    'ask_clips',
    'Ask AI a question with optional clip context. The AI answers based on the content of specified clips. Consumes credits.',
    {
        message: z.string().describe('Question to ask'),
        clipIds: z.array(z.string()).optional().describe('Clip IDs for context (up to 20)'),
        language: z.enum(['ko', 'en']).optional().describe('Response language (default: ko)'),
    },
    async ({ message, clipIds, language }) => safeCall(() => client.askAI(message, clipIds, language))
);

server.tool(
    'get_insights',
    'Generate an insights report analyzing reading patterns, topic trends, and recommendations over a time period. Consumes credits.',
    {
        period: z.enum(['week', 'month', 'quarter', 'custom']).optional().describe('Time period (default: week)'),
        days: z.number().min(1).max(365).optional().describe('Custom number of days (for period=custom)'),
        language: z.enum(['ko', 'en']).optional().describe('Report language (default: ko)'),
    },
    async (params) => safeCall(() => client.getInsights(params.period, params.days, params.language))
);

// ── Collection Tools ──────────────────────────────

server.tool(
    'list_collections',
    'List all collections (folders for organizing clips) with clip counts.',
    {},
    async () => safeCall(() => client.listCollections())
);

server.tool(
    'create_collection',
    'Create a new collection (folder) for organizing clips.',
    {
        name: z.string().describe('Collection name'),
        color: z.string().optional().describe('Color hex code (e.g., "#FF5733")'),
        isPublic: z.boolean().optional().describe('Whether the collection is publicly shareable'),
    },
    async (params) => safeCall(() => client.createCollection(params))
);

server.tool(
    'update_collection',
    'Update a collection\'s name, color, or visibility.',
    {
        id: z.string().describe('Collection ID'),
        name: z.string().optional().describe('New name'),
        color: z.string().optional().describe('New color hex code'),
        isPublic: z.boolean().optional().describe('New visibility setting'),
    },
    async ({ id, ...data }) => safeCall(() => client.updateCollection(id, data))
);

server.tool(
    'delete_collection',
    'Delete a collection. Clips in the collection are not deleted, only the collection reference is removed.',
    {
        id: z.string().describe('Collection ID to delete'),
    },
    async ({ id }) => safeCall(() => client.deleteCollection(id))
);

// ── Category Tools ────────────────────────────────

server.tool(
    'list_categories',
    'List all categories with clip counts, sorted by frequency.',
    {},
    async () => safeCall(() => client.listCategories())
);

server.tool(
    'create_category',
    'Create a new custom category for organizing clips.',
    {
        name: z.string().describe('Category name'),
        color: z.string().optional().describe('Color hex code (e.g., "#FF5733")'),
    },
    async ({ name, color }) => safeCall(() => client.createCategory(name, color))
);

// ── Tag Tools ─────────────────────────────────────

server.tool(
    'list_tags',
    'List all tags (keywords) used across clips, sorted by frequency. Aggregated from clip keywords.',
    {
        limit: z.number().min(1).max(100).optional().describe('Max tags to return'),
    },
    async ({ limit }) => safeCall(() => client.listTags(limit))
);

server.tool(
    'search_by_tags',
    'Find clips that have specific tags/keywords. Supports AND/OR matching.',
    {
        tags: z.array(z.string()).min(1).describe('Tags to search for'),
        match: z.enum(['all', 'any']).optional().describe('Match mode: "all" (AND) or "any" (OR, default)'),
        limit: z.number().min(1).max(50).optional().describe('Number of results'),
        offset: z.number().min(0).optional().describe('Pagination offset'),
    },
    async ({ tags, match, limit, offset }) => safeCall(() => client.searchByTags(tags, match, limit, offset))
);

// ── Bulk Tools ────────────────────────────────────

server.tool(
    'bulk_update',
    'Perform bulk operations on multiple clips at once. Actions: delete, move (change category), tag (add keywords), favorite, archive.',
    {
        action: z.enum(['delete', 'move', 'tag', 'favorite', 'archive']).describe('Bulk action to perform'),
        ids: z.array(z.string()).min(1).max(100).describe('Clip IDs to update'),
        category: z.string().optional().describe('Target category (required for "move" action)'),
        tags: z.array(z.string()).optional().describe('Tags to add (required for "tag" action)'),
        value: z.boolean().optional().describe('Boolean value for "favorite" and "archive" actions (default: true)'),
    },
    async ({ action, ids, category, tags, value }) => safeCall(() => client.bulkUpdate({ action, ids, category, tags, value }))
);

// ── Webhook Tools ─────────────────────────────────

server.tool(
    'list_webhooks',
    'List all webhook subscriptions with delivery statistics.',
    {},
    async () => safeCall(() => client.listWebhooks())
);

server.tool(
    'create_webhook',
    'Create a webhook subscription. The URL must be HTTPS and reachable. Returns a secret for verifying webhook signatures (HMAC-SHA256).',
    {
        url: z.string().url().describe('Webhook URL (must be HTTPS)'),
        events: z.array(z.string()).min(1).describe('Events to subscribe to: clip.created, clip.updated, clip.deleted, clip.analyzed, content.generated, collection.created, collection.updated'),
        label: z.string().max(50).optional().describe('Human-readable label for this webhook'),
    },
    async ({ url, events, label }) => safeCall(() => client.createWebhook(url, events, label))
);

server.tool(
    'delete_webhook',
    'Delete a webhook subscription.',
    {
        id: z.string().describe('Webhook subscription ID to delete'),
    },
    async ({ id }) => safeCall(() => client.deleteWebhook(id))
);

// ── Start ─────────────────────────────────────────

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error('Failed to start Linkbrain MCP server:', error);
    process.exit(1);
});
