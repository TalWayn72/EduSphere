export const subgraphUrls = {
  core: process.env.SUBGRAPH_CORE_URL ?? 'http://localhost:4001/graphql',
  content: process.env.SUBGRAPH_CONTENT_URL ?? 'http://localhost:4002/graphql',
  annotation: process.env.SUBGRAPH_ANNOTATION_URL ?? 'http://localhost:4003/graphql',
  collaboration: process.env.SUBGRAPH_COLLABORATION_URL ?? 'http://localhost:4004/graphql',
  agent: process.env.SUBGRAPH_AGENT_URL ?? 'http://localhost:4005/graphql',
  knowledge: process.env.SUBGRAPH_KNOWLEDGE_URL ?? 'http://localhost:4006/graphql',
};
