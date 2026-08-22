# @repo/mcp

A local MCP (Model Context Protocol) server that exposes a WordyMe instance to AI
clients such as Claude Code and Claude Desktop. Markdown in, Markdown out — content is
converted with the editor's own transformers, so what the AI writes is exactly what the
editor would produce if you typed the same Markdown yourself.

The server acts **as your account** (delegation — WordyMe stays single-user). Every
change it makes is saved as a new revision named **"via Claude"**, restorable from
Revisions History.

## Tools

| Tool               | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `list_spaces`      | List the Spaces in the wiki                                   |
| `list_documents`   | List one Space's documents and folders                        |
| `search_documents` | Full-text search with snippets                                |
| `read_document`    | Return a document as Markdown                                 |
| `create_note`      | Create a note from Markdown                                   |
| `update_document`  | Replace a document body with new Markdown (new revision)      |
| `move_document`    | Move a document or folder into a folder, or to the Space root |

## Setup

Requires a running WordyMe instance and its owner credentials. `WORDYME_URL` is the
origin the API answers on:

| How WordyMe runs              | `WORDYME_URL`                                  |
| ----------------------------- | ---------------------------------------------- |
| `pnpm dev` (backend directly) | `http://localhost:3000`                        |
| Docker / self-hosted          | `http://localhost:8080` (or your instance URL) |

### 1. Credentials

```bash
cp apps/mcp/.env.example apps/mcp/.env
```

Fill in `apps/mcp/.env`. It is git-ignored and read by the server at startup; variables
already present in the environment take precedence over the file.

### 2. Claude Code (desktop app or CLI)

Nothing to install: the repository ships a project-level `.mcp.json` that starts the
server with `pnpm --filter @repo/mcp --silent start`. Open the repository in Claude Code
and approve the project MCP server when prompted — new sessions then have the `wordyme`
tools. Check status with `/mcp` inside a session.

### Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wordyme": {
      "command": "pnpm",
      "args": ["--dir", "/path/to/WordyMe", "--filter", "@repo/mcp", "--silent", "start"]
    }
  }
}
```

Credentials never live in MCP client configuration or in this repository — only in
`apps/mcp/.env` (or the process environment).

## Notes

- `pnpm smoke` runs the Markdown round-trip self-test (no WordyMe instance needed).
- Content fidelity is bounded by Markdown: standard constructs plus the editor's fenced
  extensions (```mermaid diagrams) round-trip; exotic nodes (sketches, scores, stickies)
  degrade to plain text. Nested list items need 4-space indentation.
- The server never deletes anything and every write is a new revision.
