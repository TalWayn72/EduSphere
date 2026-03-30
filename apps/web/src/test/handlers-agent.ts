import { graphql, HttpResponse } from 'msw';

// ─── Agent handlers ──────────────────────────────────────────────────────────

export const agentHandlers = [
  graphql.mutation('StartAgentSession', () =>
    HttpResponse.json({
      data: {
        startAgentSession: {
          id: 'session-1',
          templateType: 'TUTOR',
          status: 'ACTIVE',
          contextContentId: 'content-1',
          createdAt: new Date().toISOString(),
        },
      },
    })
  ),

  graphql.mutation('SendAgentMessage', () =>
    HttpResponse.json({
      data: {
        sendMessage: {
          id: 'msg-1',
          role: 'ASSISTANT',
          content: 'This is a mock AI response.',
          createdAt: new Date().toISOString(),
        },
      },
    })
  ),

  graphql.query('AgentSession', () =>
    HttpResponse.json({
      data: {
        agentSession: {
          id: 'session-1',
          templateType: 'TUTOR',
          status: 'ACTIVE',
          messages: [],
          createdAt: new Date().toISOString(),
        },
      },
    })
  ),

  graphql.query('MyAgentSessions', () =>
    HttpResponse.json({
      data: {
        myAgentSessions: { edges: [] },
      },
    })
  ),

  graphql.mutation('EndAgentSession', () =>
    HttpResponse.json({
      data: { endSession: { id: 'session-1', status: 'ENDED' } },
    })
  ),
];
