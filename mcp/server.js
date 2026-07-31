#!/usr/bin/env node
/**
 * MCP server exposing Nour Aldeen Tofi's profile as callable tools.
 *
 * Speaks MCP over stdio as newline-delimited JSON-RPC 2.0 directly, so the
 * repository keeps its zero-dependency promise — nothing to install, nothing
 * to age.
 *
 *   node mcp/server.js
 */

import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadDb } from '../scripts/lib/load.mjs';
import { TOOLS } from './tools.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'data');
const PROTOCOL_VERSION = '2024-11-05';

const db = loadDb(DATA_DIR);
const byName = new Map(TOOLS.map((t) => [t.name, t]));

const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const replyError = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

function callTool(name, args) {
  const tool = byName.get(name);
  if (!tool) throw new Error(`unknown tool "${name}"`);
  return tool.handler(db, args ?? {});
}

function handle(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'nour-profile', version: '1.0.0' },
      });

    case 'tools/list':
      return reply(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      });

    case 'tools/call': {
      try {
        const result = callTool(params?.name, params?.arguments);
        return reply(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      } catch (err) {
        // Surfaced as a tool error, not a protocol error — a bad argument
        // should never take the server down.
        return reply(id, {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        });
      }
    }

    case 'ping':
      return reply(id, {});

    default:
      // Notifications carry no id and expect no response.
      if (id === undefined) return;
      return replyError(id, -32601, `method not found: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return replyError(null, -32700, 'parse error');
  }
  try {
    handle(msg);
  } catch (err) {
    if (msg.id !== undefined) replyError(msg.id, -32603, err.message);
  }
});
