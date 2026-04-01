import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const TOOLS: Tool[] = [
  {
    name: 'cb_publish',
    description: 'Publish an event to a named channel',
    inputSchema: {
      type: 'object' as const,
      properties: {
        channel: { type: 'string', description: 'Channel name' },
        agent_id: { type: 'string', description: 'Publishing agent ID' },
        payload: { type: 'string', description: 'JSON payload string' },
      },
      required: ['channel', 'agent_id', 'payload'],
    },
  },
  {
    name: 'cb_subscribe',
    description: 'Read events from a channel, optionally since a timestamp',
    inputSchema: {
      type: 'object' as const,
      properties: {
        channel: { type: 'string', description: 'Channel name' },
        since: { type: 'number', description: 'Unix timestamp (optional)' },
      },
      required: ['channel'],
    },
  },
  {
    name: 'cb_lock_file',
    description: 'Acquire an advisory lock on a file path',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path to lock' },
        agent_id: { type: 'string', description: 'Requesting agent ID' },
        ttl_ms: {
          type: 'number',
          description: 'Lock TTL in ms (default 300000)',
        },
      },
      required: ['path', 'agent_id'],
    },
  },
  {
    name: 'cb_unlock_file',
    description: 'Release a previously acquired file lock',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path to unlock' },
        agent_id: { type: 'string', description: 'Owner agent ID' },
      },
      required: ['path', 'agent_id'],
    },
  },
  {
    name: 'cb_check_lock',
    description: 'Check if a file path is currently locked',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path to check' },
      },
      required: ['path'],
    },
  },
  {
    name: 'cb_register_agent',
    description: 'Register or update an agent in the coordination system',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Unique agent identifier' },
        division: { type: 'string', description: 'Division name' },
        role: { type: 'string', description: 'Agent role' },
      },
      required: ['id', 'division', 'role'],
    },
  },
  {
    name: 'cb_update_status',
    description: 'Update an agent status',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Agent ID' },
        status: {
          type: 'string',
          enum: ['registered', 'running', 'blocked', 'complete', 'failed'],
          description: 'New status',
        },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'cb_get_agents',
    description: 'List all registered agents',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'cb_get_division_status',
    description: 'Get agents in a specific division',
    inputSchema: {
      type: 'object' as const,
      properties: {
        division: { type: 'string', description: 'Division name' },
      },
      required: ['division'],
    },
  },
  {
    name: 'cb_log_violation',
    description: 'Log an Iron Rule violation',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agent_id: { type: 'string', description: 'Violating agent ID' },
        rule: { type: 'string', description: 'Rule that was violated' },
        details: { type: 'string', description: 'Details (optional)' },
      },
      required: ['agent_id', 'rule'],
    },
  },
  {
    name: 'cb_get_violations',
    description: 'Query violation records',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agent_id: { type: 'string', description: 'Filter by agent (optional)' },
        since: {
          type: 'number',
          description: 'Unix timestamp filter (optional)',
        },
      },
    },
  },
  {
    name: 'cb_request_help',
    description: 'Request help from another division',
    inputSchema: {
      type: 'object' as const,
      properties: {
        from_agent: { type: 'string', description: 'Requesting agent ID' },
        to_division: { type: 'string', description: 'Target division' },
        query: { type: 'string', description: 'Help request text' },
      },
      required: ['from_agent', 'to_division', 'query'],
    },
  },
  {
    name: 'cb_respond_help',
    description: 'Respond to a help request',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: 'Help request ID' },
        response: { type: 'string', description: 'Response text' },
      },
      required: ['id', 'response'],
    },
  },
  {
    name: 'cb_get_pending_help',
    description: 'Get pending help requests, optionally filtered by division',
    inputSchema: {
      type: 'object' as const,
      properties: {
        division: {
          type: 'string',
          description: 'Filter by division (optional)',
        },
      },
    },
  },
  {
    name: 'cb_health',
    description: 'Health check — returns DB status and table counts',
    inputSchema: { type: 'object' as const, properties: {} },
  },
];
