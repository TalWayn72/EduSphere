#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getDb, closeDb } from './db.js';
import { publish, subscribe } from './pubsub.js';
import { acquireLock, releaseLock, checkLock } from './locks.js';
import {
  registerAgent,
  updateStatus,
  getAgents,
  getDivisionStatus,
} from './status.js';
import { logViolation, getViolations } from './rules.js';
import { requestHelp, respondHelp, getPendingHelp } from './help.js';

const server = new McpServer({
  name: 'coordination-bridge',
  version: '1.0.0',
});

// --- Pub/Sub ---
server.tool(
  'cb_publish',
  { channel: z.string(), agent_id: z.string(), payload: z.string() },
  async (args) => {
    const result = publish(args.channel, args.agent_id, args.payload);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

server.tool(
  'cb_subscribe',
  { channel: z.string(), since: z.number().optional() },
  async (args) => {
    const events = subscribe(args.channel, args.since);
    return { content: [{ type: 'text', text: JSON.stringify(events) }] };
  }
);

// --- Locks ---
server.tool(
  'cb_lock_file',
  { path: z.string(), agent_id: z.string(), ttl_ms: z.number().optional() },
  async (args) => {
    const result = acquireLock(args.path, args.agent_id, args.ttl_ms);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

server.tool(
  'cb_unlock_file',
  { path: z.string(), agent_id: z.string() },
  async (args) => {
    const result = releaseLock(args.path, args.agent_id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

server.tool('cb_check_lock', { path: z.string() }, async (args) => {
  const result = checkLock(args.path);
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});

// --- Agent Status ---
server.tool(
  'cb_register_agent',
  { id: z.string(), division: z.string(), role: z.string() },
  async (args) => {
    const agent = registerAgent(args.id, args.division, args.role);
    return { content: [{ type: 'text', text: JSON.stringify(agent) }] };
  }
);

server.tool(
  'cb_update_status',
  {
    id: z.string(),
    status: z.enum(['registered', 'running', 'blocked', 'complete', 'failed']),
  },
  async (args) => {
    const agent = updateStatus(args.id, args.status);
    if (!agent)
      return {
        content: [
          { type: 'text', text: JSON.stringify({ error: 'Agent not found' }) },
        ],
      };
    return { content: [{ type: 'text', text: JSON.stringify(agent) }] };
  }
);

server.tool('cb_get_agents', {}, async () => {
  const agents = getAgents();
  return { content: [{ type: 'text', text: JSON.stringify(agents) }] };
});

server.tool(
  'cb_get_division_status',
  { division: z.string() },
  async (args) => {
    const agents = getDivisionStatus(args.division);
    return { content: [{ type: 'text', text: JSON.stringify(agents) }] };
  }
);

// --- Violations ---
server.tool(
  'cb_log_violation',
  { agent_id: z.string(), rule: z.string(), details: z.string().optional() },
  async (args) => {
    const v = logViolation(args.agent_id, args.rule, args.details);
    return { content: [{ type: 'text', text: JSON.stringify(v) }] };
  }
);

server.tool(
  'cb_get_violations',
  { agent_id: z.string().optional(), since: z.number().optional() },
  async (args) => {
    const violations = getViolations(args.agent_id, args.since);
    return { content: [{ type: 'text', text: JSON.stringify(violations) }] };
  }
);

// --- Help Requests ---
server.tool(
  'cb_request_help',
  { from_agent: z.string(), to_division: z.string(), query: z.string() },
  async (args) => {
    const req = requestHelp(args.from_agent, args.to_division, args.query);
    return { content: [{ type: 'text', text: JSON.stringify(req) }] };
  }
);

server.tool(
  'cb_respond_help',
  { id: z.number(), response: z.string() },
  async (args) => {
    const req = respondHelp(args.id, args.response);
    if (!req)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Help request not found' }),
          },
        ],
      };
    return { content: [{ type: 'text', text: JSON.stringify(req) }] };
  }
);

server.tool(
  'cb_get_pending_help',
  { division: z.string().optional() },
  async (args) => {
    const requests = getPendingHelp(args.division);
    return { content: [{ type: 'text', text: JSON.stringify(requests) }] };
  }
);

// --- Health ---
server.tool('cb_health', {}, async () => {
  const db = getDb();
  const dbPath = process.env['BRIDGE_DB_PATH'] || '.hivemind/coordination.db';
  const tables = (
    db
      .prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table'")
      .get() as { c: number }
  ).c;
  const eventsCount = (
    db.prepare('SELECT count(*) as c FROM events').get() as { c: number }
  ).c;
  const agentsCount = (
    db.prepare('SELECT count(*) as c FROM agents').get() as { c: number }
  ).c;
  const locksCount = (
    db.prepare('SELECT count(*) as c FROM locks').get() as { c: number }
  ).c;
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'ok',
          db_path: dbPath,
          tables,
          events_count: eventsCount,
          agents_count: agentsCount,
          locks_count: locksCount,
        }),
      },
    ],
  };
});

// --- Start ---
async function main(): Promise<void> {
  getDb(); // Initialize DB on startup
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on('SIGINT', () => {
    closeDb();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    closeDb();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  closeDb();
  process.exit(1);
});
