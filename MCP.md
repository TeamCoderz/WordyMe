# Connect Claude to your wiki

WordyMe ships an [MCP](https://modelcontextprotocol.io) server. Point Claude Code or
Claude Desktop at your wiki and Claude can search it, read any page, write new notes and
revise existing ones — in plain Markdown, as your own account, with every change recorded
as a restorable revision.

```text
You:    Read my DOCKERHUB document and create a note called "MCP Test"
        with a summary table and a mermaid diagram of the release flow.

Claude: Created "MCP Test" in Color Workspace — open it in WordyMe:
        the table renders, the diagram draws, Revisions History says "via Claude".
```

## Why this one is different

**It speaks the editor's own language.** Claude writes Markdown; WordyMe's editor converts
it with the exact transformers it uses when _you_ type Markdown. Headings, lists, tables,
code blocks and even Mermaid diagram fences become real rich-text nodes — not an
approximation. Reading goes the other way through the same transformers, so Claude sees
your pages as faithful Markdown.

**It is you, not a second user.** WordyMe is deliberately single-user. The server signs in
with your credentials and acts on your behalf — the same delegation model every
connected app uses — so there is no "AI account" to manage and no sharing model to bolt
on.

**Nothing is ever lost.** Every write is a new revision named **"via Claude"**. Earlier
revisions stay in Revisions History and can be restored with one click. The server never
deletes anything.

**Local by design.** It runs on your machine, next to your clone of the repository.
Credentials live in a git-ignored file you control. Nothing about the WordyMe app or its
Docker image changes.

## What Claude can do

| Tool               | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| `list_spaces`      | List your Spaces                                               |
| `list_documents`   | List the documents and folders of one Space                    |
| `search_documents` | Full-text search across the wiki, with snippets                |
| `read_document`    | Return a page as Markdown                                      |
| `create_note`      | Create a note from Markdown, optionally inside a folder        |
| `update_document`  | Replace a page body with new Markdown, saved as a new revision |
| `move_document`    | Move a page or folder into a folder, or back to the Space root |

Things people ask once it is connected:

- _"Search my wiki for everything about backups and summarise it."_
- _"Read my meeting notes from this week and draft the follow-up email."_
- _"Turn this rough list into a properly structured page with a table."_
- _"Add a Mermaid diagram of the deployment flow to the Docker page."_

## Setup in three steps

Requires a running WordyMe and a clone of this repository.

1. **Credentials** — copy the example and fill in your login:

   ```bash
   cp apps/mcp/.env.example apps/mcp/.env
   ```

   `WORDYME_URL` is where the API answers: `http://localhost:3000` for `pnpm dev`,
   `http://localhost:8080` for Docker, or your instance URL.

2. **Claude Code** (desktop app or CLI) — nothing to install. The repository carries a
   project-level `.mcp.json`; open the repository in Claude Code and approve the
   `wordyme` server when prompted.

3. **Claude Desktop** — add to `claude_desktop_config.json`:

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

Then ask Claude to list your Spaces.

## How it works

- **Conversion** runs a headless copy of the WordyMe editor in Node — the same node list
  and the same Markdown transformers the browser uses — so output is what the editor
  itself would have produced.
- **Authentication** uses the backend's existing Better Auth bearer-token support: one
  sign-in at first use, an expired session re-signs transparently.
- **Writes** go through the normal document and revision APIs; MCP-created notes are
  structurally identical to notes created in the editor.

The implementation lives in [`apps/mcp`](apps/mcp/README.md).

## Honest limits

- Fidelity is bounded by Markdown. Standard constructs and the editor's fenced
  extensions (` ```mermaid `) round-trip; exotic nodes such as sketches, scores and
  stickies degrade to plain text when read.
- Nested list items need 4-space indentation.
- Claude acts with your full account; the server is meant for your own machine.

## What's next

- **Built into the image.** An opt-in `/mcp` endpoint inside the WordyMe container, so
  self-hosters connect Claude with a URL and no local setup.
- **Proper OAuth.** WordyMe as the identity provider — Claude signs in through WordyMe's
  own consent screen, with revocable tokens and read-only scopes.
- **claude.ai.** With the two above, publicly reachable instances connect from the web app
  as well.
