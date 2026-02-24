# EduSphere - Demo Queries

**GraphQL Federation v2 - Example Queries**
Test all 6 subgraphs + cross-subgraph federation

---

## 🚀 Quick Test - Gateway Health

```graphql
{
  _health
}
```

**Expected Response:**
```json
{
  "data": {
    "_health": "OK"
  }
}
```

---

## 👤 Core Subgraph (Port 4001)

### Create User
```graphql
mutation {
  createUser(input: {
    email: "student@example.com"
    firstName: "John"
    lastName: "Doe"
    role: STUDENT
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    email
    firstName
    lastName
    role
    createdAt
  }
}
```

### Query Users
```graphql
query {
  users(limit: 10, offset: 0) {
    id
    email
    firstName
    lastName
    role
    tenantId
  }
}
```

### Get Current User
```graphql
query {
  me {
    id
    email
    firstName
    lastName
    role
  }
}
```

---

## 📚 Content Subgraph (Port 4002)

### Create Course
```graphql
mutation {
  createCourse(input: {
    title: "Introduction to Quantum Computing"
    description: "Learn the fundamentals of quantum mechanics and quantum algorithms"
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    title
    description
    isPublished
    createdAt
  }
}
```

### Query Courses
```graphql
query {
  courses(limit: 10) {
    id
    title
    description
    isPublished
    createdAt
    updatedAt
  }
}
```

### Publish Course
```graphql
mutation {
  publishCourse(id: "course-id-here") {
    id
    title
    isPublished
  }
}
```

### Create Module
```graphql
mutation {
  createModule(input: {
    courseId: "course-id-here"
    title: "Week 1: Quantum States"
    description: "Introduction to qubits and superposition"
    orderIndex: 1
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    title
    description
    orderIndex
  }
}
```

### Create Content Item
```graphql
mutation {
  createContentItem(input: {
    moduleId: "module-id-here"
    title: "Video: Quantum Superposition Explained"
    type: VIDEO
    content: "https://example.com/video.mp4"
    orderIndex: 1
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    title
    type
    content
    orderIndex
  }
}
```

---

## 📝 Annotation Subgraph (Port 4003)

### Create Highlight
```graphql
mutation {
  createAnnotation(input: {
    type: HIGHLIGHT
    content: "This is important!"
    targetType: "CONTENT_ITEM"
    targetId: "content-item-id"
    userId: "user-id-here"
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    type
    content
    createdAt
  }
}
```

### Create Note
```graphql
mutation {
  createAnnotation(input: {
    type: NOTE
    content: "Remember to review this section before the exam"
    targetType: "MODULE"
    targetId: "module-id"
    userId: "user-id-here"
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    type
    content
    createdAt
  }
}
```

### Query User Annotations
```graphql
query {
  annotations(userId: "user-id-here", limit: 20) {
    id
    type
    content
    targetType
    targetId
    createdAt
  }
}
```

---

## 💬 Collaboration Subgraph (Port 4004)

### Create Discussion
```graphql
mutation {
  createDiscussion(input: {
    title: "Question about quantum entanglement"
    content: "Can someone explain how quantum entanglement works?"
    courseId: "course-id-here"
    userId: "user-id-here"
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    title
    content
    upvotes
    createdAt
  }
}
```

### Reply to Discussion
```graphql
mutation {
  createDiscussion(input: {
    title: "Re: Question about quantum entanglement"
    content: "Great question! Entanglement occurs when..."
    courseId: "course-id-here"
    parentId: "discussion-id-here"
    userId: "user-id-here"
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    title
    content
    parentId
  }
}
```

### Upvote Discussion
```graphql
mutation {
  upvoteDiscussion(id: "discussion-id-here") {
    id
    title
    upvotes
  }
}
```

### Query Discussions
```graphql
query {
  discussions(courseId: "course-id-here", limit: 10) {
    id
    title
    content
    upvotes
    createdAt
    replies {
      id
      content
      upvotes
    }
  }
}
```

---

## 🤖 Agent Subgraph (Port 4005)

### Create AI Tutor Session
```graphql
mutation {
  createAgentSession(input: {
    userId: "user-id-here"
    agentType: "TUTOR"
    context: "{\"courseId\": \"course-123\", \"topic\": \"quantum computing\"}"
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    agentType
    status
    createdAt
  }
}
```

### Send Message to AI
```graphql
mutation {
  createAgentMessage(input: {
    sessionId: "session-id-here"
    role: "USER"
    content: "Explain quantum superposition in simple terms"
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    role
    content
    createdAt
  }
}
```

### Query Session Messages
```graphql
query {
  agentMessages(sessionId: "session-id-here") {
    id
    role
    content
    createdAt
  }
}
```

---

## 🧠 Knowledge Subgraph (Port 4006)

### Create Embedding
```graphql
mutation {
  createEmbedding(input: {
    content: "Quantum computing uses qubits which can exist in superposition"
    embedding: [0.1, 0.2, 0.3, ..., 0.5]  # 768-dimensional vector
    sourceType: "CONTENT_ITEM"
    sourceId: "content-item-id"
    tenantId: "00000000-0000-0000-0000-000000000001"
  }) {
    id
    content
    sourceType
    createdAt
  }
}
```

### Semantic Search
```graphql
query {
  semanticSearch(
    queryVector: [0.1, 0.2, 0.3, ..., 0.5]  # 768-dimensional query vector
    limit: 10
    minSimilarity: 0.7
  ) {
    embedding {
      id
      content
      sourceType
      sourceId
    }
    similarity  # 0.0 - 1.0 (cosine similarity)
    distance    # Vector distance
  }
}
```

---

## 🔗 Federation - Cross-Subgraph Queries

### User with All Related Data
```graphql
query {
  me {
    # Core Subgraph
    id
    email
    firstName
    lastName
    role

    # Content Subgraph (via @key federation)
    enrolledCourses {
      id
      title
      progress
    }

    # Annotation Subgraph
    annotations {
      id
      type
      content
      targetType
    }

    # Collaboration Subgraph
    discussions {
      id
      title
      upvotes
    }

    # Agent Subgraph
    agentSessions {
      id
      agentType
      status
      messages {
        id
        role
        content
      }
    }
  }
}
```

### Course with All Metadata
```graphql
query {
  course(id: "course-id-here") {
    # Content Subgraph
    id
    title
    description

    # Modules
    modules {
      id
      title
      contentItems {
        id
        title
        type
      }
    }

    # Discussions (Collaboration Subgraph)
    discussions {
      id
      title
      upvotes
    }

    # Annotations (Annotation Subgraph)
    annotations {
      id
      type
      content
    }

    # Knowledge Graph (Knowledge Subgraph)
    relatedContent {
      id
      content
      similarity
    }
  }
}
```

---

## 📊 Example: Full Learning Flow

### 1. Create Student Account
```graphql
mutation CreateStudent {
  createUser(input: {
    email: "alice@university.edu"
    firstName: "Alice"
    lastName: "Johnson"
    role: STUDENT
    tenantId: "univ-001"
  }) {
    id
  }
}
```

### 2. Create Course
```graphql
mutation CreateCourse {
  createCourse(input: {
    title: "Quantum Computing 101"
    description: "Introduction to quantum computing"
    tenantId: "univ-001"
  }) {
    id
  }
}
```

### 3. Add Module & Content
```graphql
mutation AddModule {
  createModule(input: {
    courseId: "course-123"
    title: "Week 1: Basics"
    orderIndex: 1
    tenantId: "univ-001"
  }) {
    id
  }
}

mutation AddVideo {
  createContentItem(input: {
    moduleId: "module-123"
    title: "Introduction Video"
    type: VIDEO
    content: "https://cdn.example.com/intro.mp4"
    orderIndex: 1
    tenantId: "univ-001"
  }) {
    id
  }
}
```

### 4. Student Takes Notes
```graphql
mutation TakeNote {
  createAnnotation(input: {
    type: NOTE
    content: "Key concept: Superposition allows multiple states simultaneously"
    targetType: "CONTENT_ITEM"
    targetId: "content-item-123"
    userId: "alice-id"
    tenantId: "univ-001"
  }) {
    id
  }
}
```

### 5. Ask Question
```graphql
mutation AskQuestion {
  createDiscussion(input: {
    title: "Clarification needed on superposition"
    content: "How does measurement collapse the quantum state?"
    courseId: "course-123"
    userId: "alice-id"
    tenantId: "univ-001"
  }) {
    id
  }
}
```

### 6. Get AI Help
```graphql
mutation GetAIHelp {
  createAgentSession(input: {
    userId: "alice-id"
    agentType: "TUTOR"
    context: "{\"topic\": \"quantum superposition\"}"
    tenantId: "univ-001"
  }) {
    id
  }
}

mutation AskAI {
  createAgentMessage(input: {
    sessionId: "session-123"
    role: "USER"
    content: "Explain superposition simply"
    tenantId: "univ-001"
  }) {
    id
  }
}
```

---

## 🧪 Testing Commands

```bash
# Test all endpoints
make e2e

# Test specific subgraph
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users(limit: 1) { id email } }"}'

# Test federation
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ me { id email } }"}'
```

---

**Gateway GraphiQL:** http://localhost:4000/graphql
