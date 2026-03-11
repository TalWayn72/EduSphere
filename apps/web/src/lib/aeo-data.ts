import type { FAQItem } from '@/components/seo';

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is EduSphere?',
    answer:
      'EduSphere is an AI-powered learning management system (LMS) that combines adaptive course delivery, knowledge graph navigation, an AI tutor called Chavruta, gamification, and enterprise features. It supports 100,000+ concurrent users and is designed for both individual learners and large organizations.',
  },
  {
    question: 'What is the Chavruta AI tutor?',
    answer:
      "Chavruta is EduSphere's AI tutoring system inspired by the traditional Jewish study partner (chavruta) method. It uses Socratic dialogue to challenge your reasoning, adapts to your learning pace, and automatically builds concept connections in your personal knowledge graph as you learn.",
  },
  {
    question: 'How does the knowledge graph work in EduSphere?',
    answer:
      "EduSphere's knowledge graph is powered by Apache AGE (a PostgreSQL graph extension) and uses pgvector for semantic search. It maps relationships between concepts you've learned, creates visual concept maps, and helps the AI tutor suggest related topics based on your learning history.",
  },
  {
    question: 'Is EduSphere free to use?',
    answer:
      'Yes. EduSphere offers a free plan with access to 100 courses and 10 AI tutor messages per day. The Pro plan at $29/month provides unlimited courses and AI tutoring. Enterprise pricing is custom based on user count and features required.',
  },
  {
    question: 'What standards does EduSphere support?',
    answer:
      'EduSphere supports SCORM 1.2, SCORM 2004, xAPI (Tin Can), LTI 1.3, and OpenBadges 3.0. It integrates with Keycloak for SSO/SAML, supports SCIM provisioning, and is GDPR and FERPA compliant.',
  },
  {
    question: 'Is EduSphere WCAG accessible?',
    answer:
      'Yes. EduSphere is certified WCAG 2.2 AA compliant and includes skip links, ARIA landmarks, keyboard navigation support, screen reader optimization, and full support for RTL languages including Hebrew and Arabic.',
  },
  {
    question: 'Does EduSphere support multiple languages?',
    answer:
      'EduSphere supports 50+ languages with full RTL (right-to-left) support for languages including Hebrew and Arabic. The platform includes automatic locale detection, language switching, and localized content delivery.',
  },
  {
    question: 'Can EduSphere be white-labeled for my organization?',
    answer:
      'Yes. The Enterprise plan includes full white-labeling: custom domain, custom branding (colors, logo, fonts), custom email templates, a portal builder for custom learner landing pages, and multi-tenant management.',
  },
  {
    question: 'How does gamification work in EduSphere?',
    answer:
      "EduSphere's gamification system includes a 5-level mastery progression (Novice → Expert), daily streaks, OpenBadges 3.0-certified digital badges, leaderboards, XP points, and achievement notifications. Completion rates typically increase by 40-60% with gamification enabled.",
  },
  {
    question: 'What analytics and reporting does EduSphere provide?',
    answer:
      'EduSphere provides learner progress analytics, cohort insights, at-risk learner detection, CPD (Continuing Professional Development) reporting, compliance reporting, course completion rates, and AI-generated learning outcome predictions.',
  },
  {
    question: 'How secure is EduSphere?',
    answer:
      'EduSphere implements multi-tenant row-level security (RLS) in PostgreSQL, JWT authentication via Keycloak, AES-256-GCM encryption for PII fields, GDPR-compliant data handling, audit logging, and rate limiting. All data is encrypted at rest and in transit.',
  },
  {
    question: 'Can I import existing SCORM courses into EduSphere?',
    answer:
      'Yes. EduSphere supports SCORM 1.2 and SCORM 2004 course imports. You can upload SCORM packages directly through the instructor dashboard. The platform tracks completion, scores, and progress data from SCORM modules in compliance with the specification.',
  },
  {
    question: 'Does EduSphere have a mobile app?',
    answer:
      'Yes. EduSphere includes a native mobile app built with Expo SDK (React Native) for iOS and Android. The mobile app supports offline-first learning, push notifications, and shares approximately 70-80% of its codebase with the web app.',
  },
  {
    question: 'What is a Live Session in EduSphere?',
    answer:
      'Live Sessions are real-time instructor-led learning events within EduSphere. Instructors can schedule sessions, take attendance, share content, and conduct collaborative exercises. Students receive notifications and can join from web or mobile. Session recordings are stored for later review.',
  },
  {
    question: 'How does EduSphere handle data privacy under GDPR?',
    answer:
      'EduSphere is GDPR compliant. Users can request data export (portability), data deletion (right to erasure), and consent management for AI processing. PII fields (names, emails, annotations) are encrypted with AES-256-GCM. Data processing agreements are available for Enterprise customers.',
  },
  {
    question: 'Can instructors create courses with AI assistance?',
    answer:
      'Yes. EduSphere includes AI-powered course creation tools: content generation from outlines, quiz question suggestions, learning objective generation, and automatic knowledge graph tagging. Instructors can also import existing content from SCORM packages or document uploads.',
  },
  {
    question: 'What is the difference between Pro and Enterprise plans?',
    answer:
      'The Pro plan ($29/month) is for individual learners with unlimited courses and AI tutoring. The Enterprise plan is for organizations and adds: multi-tenant management, custom branding, SSO/SAML/SCIM, SLA guarantees, dedicated support, compliance reporting, and custom analytics. Enterprise pricing is based on active user count.',
  },
  {
    question: 'How long does it take to deploy EduSphere for an organization?',
    answer:
      'A standard EduSphere Enterprise deployment takes 2-4 weeks including SSO configuration, custom branding, initial course migration, and admin training. Organizations with existing SCORM libraries can import content within days using the bulk SCORM import tool.',
  },
  {
    question: 'Does EduSphere integrate with existing HR systems?',
    answer:
      'Yes. EduSphere supports SCIM 2.0 for automated user provisioning from HR systems like Workday, BambooHR, and SAP SuccessFactors. It also supports LDAP/Active Directory synchronization and SSO via SAML 2.0 and OpenID Connect (OIDC).',
  },
  {
    question: 'What AI models does EduSphere use for tutoring?',
    answer:
      "EduSphere's AI tutor uses a multi-layer AI architecture: Vercel AI SDK for LLM abstraction, LangGraph.js for conversation state management, and LlamaIndex.TS for retrieval-augmented generation (RAG). In development, Ollama runs local models. In production, OpenAI or Anthropic Claude models are used based on configuration.",
  },
];

export interface GlossaryTerm {
  term: string;
  shortDef: string;
  fullDef: string;
  category: string;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Knowledge Graph',
    shortDef: 'A semantic network representing entities and their relationships as nodes and edges.',
    fullDef:
      "A knowledge graph is a structured data model that represents real-world concepts (entities) and the relationships between them as a directed graph. In EduSphere, the knowledge graph maps educational concepts, their prerequisites, and connections to course content. It is powered by Apache AGE (a PostgreSQL graph extension using Cypher query language) and enables AI-powered concept recommendations based on learning history.",
    category: 'AI & Technology',
  },
  {
    term: 'AI Tutoring',
    shortDef:
      'Adaptive, conversational AI that personalizes learning through interactive dialogue.',
    fullDef:
      "AI tutoring uses large language models (LLMs) and pedagogical algorithms to provide personalized, one-on-one instruction at scale. Unlike static content, AI tutors adapt their explanations to the learner's current knowledge level, use Socratic questioning to deepen understanding, and generate novel practice examples. EduSphere's AI tutor (Chavruta) combines a LangGraph.js state machine with RAG retrieval from the platform's knowledge graph.",
    category: 'AI & Technology',
  },
  {
    term: 'Chavruta Method',
    shortDef:
      'A traditional Jewish learning practice where two partners learn together through dialogue and debate.',
    fullDef:
      "Chavruta (Hebrew: חַבְרוּתָא, \"friendship\" or \"partnership\") is a centuries-old Jewish pedagogical method where two learners study a text together, questioning each other's interpretations and challenging assumptions through Socratic dialogue. EduSphere's AI Chavruta tutor adapts this method digitally: the AI acts as a learning partner that debates, challenges reasoning, and builds concept connections in the learner's personal knowledge graph.",
    category: 'Pedagogy',
  },
  {
    term: 'Spaced Repetition',
    shortDef:
      'A learning technique that schedules review at increasing intervals to improve long-term retention.',
    fullDef:
      'Spaced repetition is a cognitive learning strategy based on the "spacing effect" — the finding that information is better retained when study sessions are spaced over time rather than massed together. The algorithm calculates optimal review intervals based on individual recall performance. EduSphere uses spaced repetition scheduling for knowledge graph concept reinforcement, surfacing previously learned concepts at scientifically optimal intervals.',
    category: 'Pedagogy',
  },
  {
    term: 'Mastery Learning',
    shortDef:
      'An instructional approach where learners must demonstrate competence before advancing to new material.',
    fullDef:
      "Mastery learning is an instructional strategy developed by Benjamin Bloom in which all learners are expected to achieve high levels of learning (mastery) for a given topic before moving to the next. Unlike time-based progression, mastery learning is competency-based. EduSphere implements a 5-level mastery progression (Novice → Beginner → Intermediate → Advanced → Expert) tracked through quiz scores, project submissions, and AI-assessed explanations.",
    category: 'Pedagogy',
  },
  {
    term: 'SCORM',
    shortDef: 'Sharable Content Object Reference Model — the global e-learning interoperability standard.',
    fullDef:
      'SCORM (Sharable Content Object Reference Model) is a set of technical standards for e-learning software products that enables content interoperability between different LMS platforms. SCORM packages contain learning content (HTML, JavaScript, media) with a manifest file defining structure and sequencing. EduSphere supports SCORM 1.2 and SCORM 2004 (versions 3 and 4), tracking completion status, score, and progress data according to the specification.',
    category: 'Standards',
  },
  {
    term: 'xAPI (Tin Can)',
    shortDef:
      'Experience API — a modern e-learning standard for tracking learning experiences beyond LMS boundaries.',
    fullDef:
      'xAPI (Experience API), formerly known as Tin Can API, is an e-learning specification that allows learning experiences to be recorded in an "activity stream" format (actor → verb → object). Unlike SCORM, xAPI works beyond the browser — tracking learning from mobile apps, simulations, and even offline experiences. Data is stored in a Learning Record Store (LRS). EduSphere supports xAPI statement generation for all learning activities and can connect to external LRS systems.',
    category: 'Standards',
  },
  {
    term: 'LTI (Learning Tools Interoperability)',
    shortDef: 'A standard for securely integrating external learning tools with LMS platforms.',
    fullDef:
      "Learning Tools Interoperability (LTI) is an IMS Global standard that enables external learning tools to integrate seamlessly with LMS platforms. LTI 1.3 uses OAuth 2.0 and JSON Web Tokens (JWT) for secure authentication. EduSphere implements LTI 1.3 as both a Tool Provider (allowing other LMS platforms to launch EduSphere content) and a Tool Consumer (allowing external tools to be embedded within EduSphere courses).",
    category: 'Standards',
  },
  {
    term: 'Gamification',
    shortDef:
      'The application of game-design elements to non-game contexts to increase engagement.',
    fullDef:
      "Gamification in e-learning applies game mechanics — points, badges, leaderboards, streaks, and progression levels — to educational activities to increase motivation and engagement. Research shows gamification can increase course completion rates by 40-60%. EduSphere's gamification system includes XP points, daily streaks, OpenBadges 3.0-certified digital badges, a 5-level mastery progression, leaderboards, and achievement notifications sent via push notifications.",
    category: 'Pedagogy',
  },
  {
    term: "Bloom's Taxonomy",
    shortDef:
      'A hierarchical model classifying educational learning objectives into six cognitive levels.',
    fullDef:
      "Bloom's Taxonomy (revised 2001) classifies cognitive learning objectives into six levels in increasing complexity: Remember → Understand → Apply → Analyze → Evaluate → Create. EduSphere uses Bloom's levels to tag course content and assessments, enabling the AI tutor to calibrate question difficulty appropriately. Quiz questions in EduSphere are categorized by Bloom's level to ensure balanced assessment across recall, comprehension, and higher-order thinking.",
    category: 'Pedagogy',
  },
  {
    term: 'OpenBadges',
    shortDef: 'A digital credential standard for verifiable, portable achievement badges.',
    fullDef:
      "OpenBadges (IMS Global) is a specification for digital badges that contain verifiable metadata about achievements: who earned it, who issued it, what criteria were met, and when. EduSphere issues OpenBadges 3.0-compliant digital badges upon course completion and skill mastery. Badges can be displayed on LinkedIn, personal portfolios, and digital wallets. EduSphere's BadgeVerifier page allows anyone to verify badge authenticity.",
    category: 'Standards',
  },
  {
    term: 'pgvector',
    shortDef: 'A PostgreSQL extension enabling vector similarity search for AI embeddings.',
    fullDef:
      'pgvector is an open-source PostgreSQL extension that adds vector data types and similarity search capabilities. It enables storing and querying high-dimensional embedding vectors (typically 768-1536 dimensions) directly in PostgreSQL using HNSW (Hierarchical Navigable Small World) indexes. EduSphere uses pgvector with 768-dimensional nomic-embed-text embeddings for semantic search across course content, enabling "similar concepts" recommendations and AI-powered content retrieval.',
    category: 'AI & Technology',
  },
  {
    term: 'Retrieval-Augmented Generation (RAG)',
    shortDef:
      'An AI technique combining knowledge retrieval with LLM generation for accurate, grounded responses.',
    fullDef:
      "Retrieval-Augmented Generation (RAG) is an AI framework that enhances large language model (LLM) responses by first retrieving relevant information from a knowledge base, then using that retrieved context to generate accurate, grounded answers. EduSphere implements HybridRAG — combining pgvector semantic search with Apache AGE graph traversal — before querying the LLM. This enables the AI tutor to reference specific course materials rather than relying solely on LLM training data.",
    category: 'AI & Technology',
  },
  {
    term: 'Multi-Tenancy',
    shortDef:
      'A software architecture where a single instance serves multiple isolated customer organizations.',
    fullDef:
      "Multi-tenancy is a software architecture pattern where a single application instance serves multiple customer organizations (tenants) while keeping their data completely isolated. EduSphere implements multi-tenancy at the database level using PostgreSQL Row-Level Security (RLS) — every database query automatically filters data based on the authenticated tenant. Tenant isolation is enforced cryptographically: one tenant cannot access another's courses, users, or analytics.",
    category: 'Technical',
  },
  {
    term: 'Row-Level Security (RLS)',
    shortDef:
      'A database feature that restricts which rows users can access based on their identity.',
    fullDef:
      "Row-Level Security (RLS) is a PostgreSQL feature that allows defining policies controlling which rows are visible or modifiable for each database user or role. In EduSphere, every table has RLS policies that automatically filter queries based on the current tenant ID (set via JWT). This means even if application code accidentally queries without a tenant filter, the database enforces isolation at the row level — preventing cross-tenant data leakage.",
    category: 'Technical',
  },
  {
    term: 'GraphQL Federation',
    shortDef:
      'An architecture pattern for composing multiple GraphQL APIs into a single unified supergraph.',
    fullDef:
      'GraphQL Federation (Apollo Federation / Hive Gateway) enables splitting a large GraphQL API into smaller, independently deployable subgraphs that are composed into a single supergraph. EduSphere uses GraphQL Federation v2.7 with 6 subgraphs: Core (users, auth), Content (courses, lessons), Annotation (highlights, notes), Collaboration (live sessions), Agent (AI tutor), and Knowledge (graph, embeddings). Each subgraph owns specific entities and references others via @key directives.',
    category: 'Technical',
  },
  {
    term: 'SCIM (System for Cross-domain Identity Management)',
    shortDef:
      'An open standard for automating user provisioning between identity providers and applications.',
    fullDef:
      'SCIM 2.0 is an IETF standard protocol for automating user and group management between identity providers (like Okta, Entra ID, Workday) and service providers (like EduSphere). With SCIM, when an employee joins or leaves an organization, their EduSphere account is automatically created or deactivated. EduSphere implements SCIM 2.0 for user, group, and role synchronization, reducing IT overhead for enterprise customers.',
    category: 'Standards',
  },
  {
    term: 'Learning Path',
    shortDef:
      'A curated sequence of learning activities designed to achieve a specific educational goal.',
    fullDef:
      "A learning path is a structured progression of courses, lessons, assessments, and practice activities organized to take a learner from a defined starting point to a target competency. In EduSphere, learning paths can be AI-generated based on skill assessments, manually curated by instructors, or derived from the knowledge graph by finding the optimal concept sequence. Learning paths adapt dynamically as learners demonstrate mastery or struggle with specific concepts.",
    category: 'Pedagogy',
  },
  {
    term: 'Apache AGE',
    shortDef:
      'A PostgreSQL extension that adds graph database functionality using the Cypher query language.',
    fullDef:
      'Apache AGE (A Graph Extension) is an open-source PostgreSQL extension that provides graph database functionality directly within PostgreSQL. It implements the openCypher query language for graph queries while storing graph data as PostgreSQL tables. EduSphere uses Apache AGE to power its knowledge graph: concepts are stored as nodes, relationships (prerequisites, related-to, part-of) as edges. This enables Cypher-based graph traversal queries like "find all concepts related to machine learning within 3 hops."',
    category: 'AI & Technology',
  },
  {
    term: 'Instructor-Led Training (ILT)',
    shortDef:
      'Formal training delivered by a human instructor in real-time, in-person or virtually.',
    fullDef:
      "Instructor-Led Training (ILT) refers to traditional training formats where a certified instructor delivers content directly to learners, either in a physical classroom or via virtual classroom tools. EduSphere's Live Sessions feature implements virtual ILT: instructors schedule real-time sessions, learners join from web or mobile, and the system tracks attendance and engagement. ILT sessions in EduSphere can be blended with self-paced content in the same course structure.",
    category: 'Pedagogy',
  },
];
