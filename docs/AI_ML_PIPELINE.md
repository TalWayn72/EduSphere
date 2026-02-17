# AI/ML Pipeline (Phase 14)

Complete AI/ML infrastructure with RAG, LangGraph workflows, and semantic search.

## Overview

**Packages:**
- ✅ `@edusphere/rag` - Retrieval Augmented Generation pipeline
- ✅ `@edusphere/langgraph-workflows` - AI agent workflows

**Features:**
- Semantic search with pgvector
- Hybrid search (semantic + keyword + graph)
- Cached embeddings with Redis
- 4 LangGraph workflows (Tutor, Quiz, Debate, Assessment)
- Streaming responses
- Multi-tenant isolation

## RAG Package (@edusphere/rag)

### Architecture

```
Query → Embeddings → Vector Search → Retrieval → LLM → Answer
                              ↓
                         PostgreSQL
                        (pgvector)
```

### Components

#### 1. Cached Embeddings
```typescript
import { createEmbeddings } from '@edusphere/rag';

const embeddings = createEmbeddings(process.env.OPENAI_API_KEY!, {
  model: 'text-embedding-3-small',
  dimensions: 768,
  cacheEnabled: true,
  cacheTTL: 86400,
});

embeddings.configureCache(process.env.REDIS_URL!);

// Embed single query
const vector = await embeddings.embedQuery('What is GraphQL?');

// Embed multiple documents (batched)
const vectors = await embeddings.embedDocuments([
  'GraphQL is a query language...',
  'REST is an architectural style...',
]);
```

#### 2. Vector Store (pgvector)
```typescript
import { createVectorStore } from '@edusphere/rag';

const store = createVectorStore(
  process.env.DATABASE_URL!,
  'vector_documents',
  768
);

await store.initialize();

// Add documents
await store.addDocument({
  id: 'doc1',
  content: 'GraphQL enables clients to request exactly the data they need',
  embedding: vector,
  metadata: { source: 'lesson-1', type: 'definition' },
  tenantId: 'tenant-123',
});

// Search
const results = await store.similaritySearch(
  queryVector,
  'tenant-123',
  10,
  0.7
);
```

#### 3. Semantic Retriever
```typescript
import { createRetriever } from '@edusphere/rag';

const retriever = createRetriever(embeddings, store);

// Retrieve relevant documents
const results = await retriever.retrieve(
  'Explain GraphQL queries',
  'tenant-123',
  { topK: 5, similarityThreshold: 0.7 }
);

// Retrieve with formatted context
const { results, context } = await retriever.retrieveWithContext(
  'Explain GraphQL queries',
  'tenant-123'
);
```

#### 4. RAG Pipeline
```typescript
import { createRAGPipeline } from '@edusphere/rag';

const rag = createRAGPipeline(retriever, 'gpt-4-turbo');

// Generate answer
const result = await rag.generate(
  'What are the benefits of GraphQL?',
  'tenant-123',
  { temperature: 0.7, maxTokens: 1000 }
);

console.log(result.answer);
console.log(result.sources);
console.log(result.metadata);

// Stream answer
for await (const chunk of rag.generateStream(
  'Explain GraphQL subscriptions',
  'tenant-123'
)) {
  process.stdout.write(chunk);
}

// Chat mode
const chatResult = await rag.chat(
  [
    { role: 'user', content: 'What is GraphQL?' },
    { role: 'assistant', content: 'GraphQL is...' },
    { role: 'user', content: 'How does it compare to REST?' },
  ],
  'tenant-123'
);
```

#### 5. Hybrid Search
```typescript
import { Pool } from 'pg';
import { createHybridSearch } from '@edusphere/rag';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const hybrid = createHybridSearch(pool, embeddings);

// Combine semantic + keyword search
const results = await hybrid.search(
  'GraphQL performance optimization',
  'tenant-123',
  {
    topK: 10,
    semanticWeight: 0.7,
    keywordWeight: 0.3,
    rerankTopK: 20,
  }
);

// With knowledge graph traversal
const graphResults = await hybrid.searchWithGraphTraversal(
  'GraphQL caching strategies',
  'tenant-123'
);
```

## LangGraph Workflows

### 1. Adaptive Tutor Workflow

**Flow:** Assess → Explain → Verify → Follow-up

```typescript
import { createTutorWorkflow } from '@edusphere/langgraph-workflows';

const tutor = createTutorWorkflow('gpt-4-turbo');

const result = await tutor.run({
  question: 'How do GraphQL subscriptions work?',
  context: 'Course material on GraphQL...',
  studentLevel: 'intermediate',
});

console.log(result.explanation);
console.log(result.comprehensionCheck);
console.log(result.followupSuggestions);

// Stream progress
for await (const state of tutor.stream({
  question: 'Explain database normalization',
})) {
  console.log(`Step: ${state.currentStep}`);
}
```

### 2. Quiz Generator Workflow

**Flow:** Generate → Validate

```typescript
import { createQuizWorkflow } from '@edusphere/langgraph-workflows';

const quiz = createQuizWorkflow('gpt-4-turbo');

const result = await quiz.run({
  topic: 'React hooks',
  numQuestions: 5,
  difficulty: 'medium',
});

for (const question of result.questions) {
  console.log(question.question);
  question.options.forEach((opt, i) => console.log(`${i + 1}. ${opt}`));
  console.log(`Correct: ${question.correctAnswer + 1}`);
  console.log(`Explanation: ${question.explanation}\n`);
}
```

### 3. Chavruta Debate Workflow

**Flow:** Argue ↔ Counter (N rounds) → Synthesize

```typescript
import { createDebateWorkflow } from '@edusphere/langgraph-workflows';

const debate = createDebateWorkflow('gpt-4-turbo');

const result = await debate.run({
  topic: 'Should AI be used in education?',
  position: 'for',
  rounds: 3,
});

for (const arg of result.arguments) {
  console.log(`\nRound ${arg.round}:`);
  console.log(`Argument: ${arg.argument}`);
  console.log(`Counter: ${arg.counterArgument}`);
}

console.log(`\nSynthesis:\n${result.synthesis}`);
```

### 4. Assessment Workflow

**Flow:** Evaluate → Synthesize

```typescript
import { createAssessmentWorkflow } from '@edusphere/langgraph-workflows';

const assessor = createAssessmentWorkflow('gpt-4-turbo');

const result = await assessor.run({
  submissions: [
    {
      questionId: 'q1',
      question: 'Explain REST vs GraphQL',
      studentAnswer: 'REST uses fixed endpoints...',
      rubric: 'Score based on accuracy, depth, examples',
    },
    {
      questionId: 'q2',
      question: 'What are React hooks?',
      studentAnswer: 'Hooks are functions that...',
    },
  ],
});

for (const eval of result.evaluations) {
  console.log(`${eval.questionId}: ${eval.score}/100`);
  console.log(eval.feedback);
}

console.log(`\nOverall: ${result.overallAssessment?.overallScore}/100`);
console.log('Strengths:', result.overallAssessment?.strengths);
console.log('Recommendations:', result.overallAssessment?.recommendations);
```

## Integration with Subgraphs

### Agent Subgraph Example

```typescript
import { createRAGPipeline, createEmbeddings, createVectorStore } from '@edusphere/rag';
import { createTutorWorkflow } from '@edusphere/langgraph-workflows';

// Initialize RAG
const embeddings = createEmbeddings(process.env.OPENAI_API_KEY!);
embeddings.configureCache(process.env.REDIS_URL!);

const store = createVectorStore(process.env.DATABASE_URL!);
await store.initialize();

const retriever = createRetriever(embeddings, store);
const rag = createRAGPipeline(retriever);

// GraphQL Resolver
@Mutation('askTutor')
async askTutor(
  @Args('question') question: string,
  @Args('sessionId') sessionId: string,
  @Context() ctx: any
) {
  const result = await rag.generate(
    question,
    ctx.tenantId,
    { temperature: 0.7 }
  );

  // Save to database
  await this.agentService.saveMessage({
    sessionId,
    role: 'assistant',
    content: result.answer,
    sources: result.sources,
  });

  return {
    id: generateId(),
    content: result.answer,
    sources: result.sources,
  };
}

@Subscription('tutorStream')
async *tutorStream(@Args('question') question: string, @Context() ctx: any) {
  for await (const chunk of rag.generateStream(question, ctx.tenantId)) {
    yield { chunk };
  }
}
```

## Production Deployment

### Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/edusphere

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Model Configuration
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=768
LLM_MODEL=gpt-4-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000

# RAG Configuration
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.7
RAG_CACHE_TTL=86400
```

### Performance Tuning

**Embedding Cache:**
- Cache TTL: 24 hours for stable content, 1 hour for dynamic
- Redis cluster for high availability
- Monitor cache hit rate (target: > 80%)

**Vector Search:**
- HNSW index with m=16, ef_construction=64
- Adjust similarity threshold based on precision/recall needs
- Use pagination for large result sets

**LLM Optimization:**
- Use streaming for better UX
- Implement request queuing for rate limits
- Monitor token usage and costs

## Next Steps

### Phase 15: Mobile App Polish
- Push notifications
- Biometric authentication
- Offline course downloads
- Background sync

---

**Version:** 1.0.0
**Last Updated:** February 2026
