# Nour Profile — MCP server

An [MCP](https://modelcontextprotocol.io) server that exposes Nour Aldeen Tofi's
professional profile as callable tools, so an AI assistant can **query** it rather than
scrape a web page.

It speaks JSON-RPC 2.0 over stdio directly — **no dependencies, no `npm install`.** It
reads `../data/*.json`, the same source of truth the website is built from, so the two
can never disagree.

## Tools

| Tool | Answers |
|---|---|
| `get_profile` | Who he is, where he is, how to reach him, what he knows |
| `search_projects` | Products and applications, filterable by free text or technology |
| `get_workflows` | Production n8n automations and AI agents |
| `get_experience` | Employment history, optionally filtered by company |
| `get_credentials` | Certifications, education, awards, with credential IDs |
| `get_testimonials` | Recommendations from colleagues and mentors |
| `answer_faq` | A natural-language question, answered from the curated FAQ |

Every tool takes an optional `lang` of `en` or `ar`.

## Install in Claude Desktop

Add this to `claude_desktop_config.json`, replacing the path with wherever you cloned
the repository:

```json
{
  "mcpServers": {
    "nour-profile": {
      "command": "node",
      "args": ["/absolute/path/to/new portfolio/mcp/server.js"]
    }
  }
}
```

On Windows, use a path such as `D:\\My Portfolio\\new portfolio\\mcp\\server.js`.

Restart Claude Desktop. Then ask things like:

- *"What automation work has Nour done with n8n?"*
- *"Show me his React projects."*
- *"Who has recommended him, and what did they say?"*
- *"Is he open to remote work?"*

## Install in Claude Code

```bash
claude mcp add nour-profile -- node "/absolute/path/to/new portfolio/mcp/server.js"
```

## Verify it works

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp/server.js
```

You should get a JSON line listing all seven tools.

## Design notes

- `tools.js` holds **pure functions** taking `(db, args)` — no I/O, no protocol. They are
  unit-tested directly in `tests/mcp-tools.test.mjs` without starting a server.
- `server.js` holds **only** protocol wiring.
- A bad argument returns a tool error (`isError: true`), never a crash. Invalid
  languages and non-positive limits are rejected by name.
- Unresolved profile links are filtered out, so the server never reports a URL that does
  not exist.
