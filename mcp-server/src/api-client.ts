/**
 * Linkbrain API Client
 *
 * HTTP client for Linkbrain v2 API.
 * All requests authenticated via X-API-Key header.
 */

export interface LinkbrainConfig {
    apiKey: string;
    baseUrl: string;
}

interface ApiResponse<T = unknown> {
    success?: boolean;
    data?: T;
    error?: { code: string; message: string; details?: Record<string, unknown> };
    meta?: { total: number; limit: number; offset: number; hasMore: boolean };
}

export class LinkbrainClient {
    private apiKey: string;
    private baseUrl: string;

    constructor(config: LinkbrainConfig) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
    }

    private async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
        const url = new URL(`${this.baseUrl}/api/v1${path}`);
        if (query) {
            Object.entries(query).forEach(([k, v]) => {
                if (v !== undefined && v !== '') url.searchParams.set(k, v);
            });
        }

        const response = await fetch(url.toString(), {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });

        let json: ApiResponse<T>;
        try {
            json = await response.json() as ApiResponse<T>;
        } catch {
            const text = await response.text().catch(() => '');
            throw new Error(`[PARSE_ERROR] Failed to parse API response (status ${response.status}): ${text.slice(0, 200)}`);
        }

        if (!response.ok || json.success === false) {
            const errMsg = json.error?.message || `API error ${response.status}: ${response.statusText}`;
            const errCode = json.error?.code || 'UNKNOWN_ERROR';
            throw new Error(`[${errCode}] ${errMsg}`);
        }

        return (json.data !== undefined ? json.data : json) as T;
    }

    // ── Clips ─────────────────────────────────────────

    async listClips(params?: {
        category?: string;
        platform?: string;
        collectionId?: string;
        isFavorite?: boolean;
        isReadLater?: boolean;
        isArchived?: boolean;
        from?: string;
        to?: string;
        search?: string;
        limit?: number;
        offset?: number;
        sort?: string;
        order?: string;
        includeContent?: boolean;
    }) {
        const query: Record<string, string> = {};
        if (params) {
            if (params.category) query.category = params.category;
            if (params.platform) query.platform = params.platform;
            if (params.collectionId) query.collectionId = params.collectionId;
            if (params.isFavorite !== undefined) query.isFavorite = String(params.isFavorite);
            if (params.isReadLater !== undefined) query.isReadLater = String(params.isReadLater);
            if (params.isArchived !== undefined) query.isArchived = String(params.isArchived);
            if (params.from) query.from = params.from;
            if (params.to) query.to = params.to;
            if (params.search) query.search = params.search;
            if (params.limit) query.limit = String(params.limit);
            if (params.offset) query.offset = String(params.offset);
            if (params.sort) query.sort = params.sort;
            if (params.order) query.order = params.order;
            if (params.includeContent) query.content = 'true';
        }
        return this.request('GET', '/clips', undefined, query);
    }

    async getClip(id: string) {
        // v2: GET /clips/{id}  (replaces v1 /clips-detail?id=)
        return this.request('GET', `/clips/${id}`);
    }

    async getClipContent(id: string) {
        // v2: GET /clips/{id}?content=true
        return this.request('GET', `/clips/${id}`, undefined, { content: 'true' });
    }

    async createClip(data: {
        url: string;
        title?: string;
        summary?: string;
        category?: string;
        keywords?: string[];
        notes?: string;
        collectionIds?: string[];
    }) {
        return this.request('POST', '/clips', data);
    }

    async updateClip(id: string, data: Record<string, unknown>) {
        // v2: PATCH /clips/{id}  (replaces v1 PATCH /clips-detail?id=)
        return this.request('PATCH', `/clips/${id}`, data);
    }

    async deleteClip(id: string) {
        // v2: DELETE /clips/{id}  (replaces v1 DELETE /clips-detail?id=)
        return this.request('DELETE', `/clips/${id}`);
    }

    async searchClips(q: string, params?: {
        category?: string;
        platform?: string;
        collectionId?: string;
        isFavorite?: boolean;
        isReadLater?: boolean;
        isArchived?: boolean;
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
        includeContent?: boolean;
    }) {
        const query: Record<string, string> = { q };
        if (params) {
            if (params.category) query.category = params.category;
            if (params.platform) query.platform = params.platform;
            if (params.collectionId) query.collectionId = params.collectionId;
            if (params.isFavorite !== undefined) query.isFavorite = String(params.isFavorite);
            if (params.isReadLater !== undefined) query.isReadLater = String(params.isReadLater);
            if (params.isArchived !== undefined) query.isArchived = String(params.isArchived);
            if (params.from) query.from = params.from;
            if (params.to) query.to = params.to;
            if (params.limit) query.limit = String(params.limit);
            if (params.offset) query.offset = String(params.offset);
            if (params.includeContent) query.content = 'true';
        }
        return this.request('GET', '/search', undefined, query);
    }

    // ── Collections ───────────────────────────────────

    async listCollections() {
        return this.request('GET', '/collections');
    }

    async createCollection(data: { name: string; color?: string; isPublic?: boolean }) {
        return this.request('POST', '/collections', data);
    }

    async updateCollection(id: string, data: Record<string, unknown>) {
        return this.request('PATCH', '/collections', data, { id });
    }

    async deleteCollection(id: string) {
        return this.request('DELETE', '/collections', undefined, { id });
    }

    // ── AI ─────────────────────────────────────────────

    async generateContent(data: { type: string; clipIds: string[]; language?: string }) {
        return this.request('POST', '/ai', { action: 'generate', ...data });
    }

    async analyzeUrl(url: string) {
        return this.request('POST', '/ai', { action: 'analyze', url });
    }

    async askAI(message: string, clipIds?: string[], language?: string) {
        return this.request('POST', '/ai', { action: 'ask', message, clipIds, language });
    }

    async getInsights(period?: string, days?: number, language?: string) {
        return this.request('POST', '/ai', { action: 'insights', period, days, language });
    }

    // ── Categories ────────────────────────────────────

    async listCategories() {
        return this.request('GET', '/manage', undefined, { action: 'categories' });
    }

    async createCategory(name: string, color?: string) {
        return this.request('POST', '/manage', { name, color }, { action: 'categories' });
    }

    // ── Tags ──────────────────────────────────────────

    async listTags(limit?: number) {
        // No dedicated tags list endpoint — aggregate from clips keywords
        const result = await this.request<{ data: Array<{ keywords?: string[] }> }>(
            'GET', '/clips', undefined, { limit: '100' }
        );

        const tagCounts = new Map<string, number>();
        const clips = Array.isArray(result) ? result : (result as { data?: unknown[] })?.data || [];
        for (const clip of clips as Array<{ keywords?: string[] }>) {
            for (const keyword of clip.keywords || []) {
                tagCounts.set(keyword, (tagCounts.get(keyword) || 0) + 1);
            }
        }

        const tags = Array.from(tagCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        return limit ? tags.slice(0, limit) : tags;
    }

    async searchByTags(tags: string[], match?: string, limit?: number, offset?: number) {
        const query: Record<string, string> = {
            action: 'tags',
            tags: tags.join(','),
        };
        if (match) query.match = match;
        if (limit) query.limit = String(limit);
        if (offset) query.offset = String(offset);
        return this.request('GET', '/manage', undefined, query);
    }

    // ── Bulk ──────────────────────────────────────────

    async bulkUpdate(data: {
        action: string;
        ids: string[];
        category?: string;
        tags?: string[];
        value?: boolean;
    }) {
        return this.request('POST', '/manage', data, { action: 'bulk' });
    }

    // ── Webhooks ──────────────────────────────────────

    async listWebhooks() {
        return this.request('GET', '/manage', undefined, { action: 'webhooks' });
    }

    async createWebhook(url: string, events: string[], label?: string) {
        return this.request('POST', '/manage', { url, events, label }, { action: 'webhooks' });
    }

    async deleteWebhook(id: string) {
        return this.request('DELETE', '/manage', undefined, { action: 'webhooks', id });
    }
}
