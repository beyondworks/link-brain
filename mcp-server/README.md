# Linkbrain MCP Server

MCP (Model Context Protocol) server for [Linkbrain](https://linkbrain.cloud) — lets Claude interact with your Second Brain directly.

## What it does

Gives Claude 23 tools to read and manage your Linkbrain data:

- **Clips**: list, search, create, update, delete, get full content
- **Collections**: list, create, update, delete
- **Categories**: list, create
- **Tags**: list, search by tags
- **Bulk operations**: delete/move/tag/favorite/archive multiple clips
- **AI**: generate content, analyze URLs, ask questions, get insights
- **Webhooks**: list, create, delete

## Requirements

- Node.js 18+
- A Linkbrain API key — get one at [linkbrain.cloud/settings?tab=api](https://linkbrain.cloud/settings?tab=api)

## Setup

### 1. Build the server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configure Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linkbrain": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "LINKBRAIN_API_KEY": "lb_your_api_key_here",
        "LINKBRAIN_API_URL": "https://linkbrain.cloud"
      }
    }
  }
}
```

Replace `/absolute/path/to/mcp-server` with the actual path, and `lb_your_api_key_here` with your API key.

A ready-to-edit config is provided in `claude-mcp-config.json`.

### 3. Restart Claude Desktop

After saving the config, restart Claude Desktop. You should see the Linkbrain tools available.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LINKBRAIN_API_KEY` | Yes | — | Your API key (`lb_...`) |
| `LINKBRAIN_API_URL` | No | `https://linkbrain.cloud` | API base URL |

## Available Tools

### Clip Tools

| Tool | Description |
|------|-------------|
| `list_clips` | List clips with filters (category, platform, collection, date range, etc.) |
| `get_clip` | Get a clip's details by ID |
| `get_clip_content` | Get the full extracted text of a clip |
| `search_clips` | Full-text search across clips |
| `create_clip` | Save a new URL as a clip |
| `update_clip` | Update clip metadata |
| `delete_clip` | Permanently delete a clip |

### AI Tools

| Tool | Description |
|------|-------------|
| `generate_content` | Generate blog posts, reports, newsletters, etc. from clips |
| `analyze_url` | Analyze a URL to extract metadata |
| `ask_clips` | Ask a question with clips as context |
| `get_insights` | Get a reading pattern insights report |

### Collection Tools

| Tool | Description |
|------|-------------|
| `list_collections` | List all collections with clip counts |
| `create_collection` | Create a new collection |
| `update_collection` | Rename or recolor a collection |
| `delete_collection` | Delete a collection (clips are kept) |

### Category & Tag Tools

| Tool | Description |
|------|-------------|
| `list_categories` | List categories with clip counts |
| `create_category` | Create a custom category |
| `list_tags` | List all tags sorted by frequency |
| `search_by_tags` | Find clips by tag (AND/OR matching) |

### Bulk & Webhook Tools

| Tool | Description |
|------|-------------|
| `bulk_update` | Bulk delete/move/tag/favorite/archive clips |
| `list_webhooks` | List webhook subscriptions |
| `create_webhook` | Create a webhook |
| `delete_webhook` | Delete a webhook |

## Troubleshooting

**"LINKBRAIN_API_KEY environment variable is required"**
The server failed to start because the API key is missing. Check that `LINKBRAIN_API_KEY` is set in your Claude Desktop config's `env` block.

**Tools not appearing in Claude**
- Verify the path in `args` points to the compiled `dist/index.js` (run `npm run build` first)
- Restart Claude Desktop after editing the config
- Check Claude Desktop logs: `~/Library/Logs/Claude/` (macOS)

**"[UNKNOWN_ERROR] API error 401"**
Your API key is invalid or expired. Generate a new one at [linkbrain.cloud/settings?tab=api](https://linkbrain.cloud/settings?tab=api).

**"[UNKNOWN_ERROR] API error 403"**
The operation requires a higher plan tier (e.g., webhooks are limited by tier). Check your plan at [linkbrain.cloud/settings](https://linkbrain.cloud/settings).

**AI tools return errors**
AI tools (`generate_content`, `ask_clips`, `get_insights`) consume credits. Ensure your account has credits available. The `analyze_url` and `ask_clips` tools require the backend `OPENAI_API_KEY` to be configured on the server.

**Build fails with TypeScript errors**
Ensure Node.js 18+ is installed: `node --version`. Then run `npm install` before `npm run build`.

## Development

```bash
# Run without building (TypeScript directly)
npm run dev

# Build
npm run build

# Run built output
npm start
```

## API Version

This server targets the **Linkbrain v2 API** (`/api/v1/*` routes).

Key v2 changes from v1:
- `GET/PATCH/DELETE /api/v1/clips/{id}` — clip detail now uses path param (was `?id=`)
- `GET /api/v1/search` — full-text search with PostgreSQL FTS
- Clips return `processingStatus` field (async background processing pipeline)
