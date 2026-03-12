export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  category: string;
  author: string;
  authorUrl: string;
  datePublished: string;
  dateModified: string;
  readingTimeMinutes: number;
  bodyMarkdown: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'knowledge-graphs-in-education',
    title: 'Why Knowledge Graphs Are the Future of Personalized Learning',
    description:
      'Knowledge graphs transform education by mapping relationships between concepts, enabling adaptive learning paths that respond to each learner\'s unique knowledge state.',
    keywords: [
      'knowledge graphs', 'personalized learning', 'AI education', 'adaptive learning',
      'graph databases', 'learning ontology', 'concept mapping',
    ],
    category: 'Technology',
    author: 'Dr. Miriam Levi',
    authorUrl: 'https://app.edusphere.dev/u/miriam-levi',
    datePublished: '2026-02-15T09:00:00Z',
    dateModified: '2026-02-15T09:00:00Z',
    readingTimeMinutes: 7,
    bodyMarkdown: `Traditional learning management systems treat educational content as a flat list of files — videos, PDFs, and quizzes lined up in a fixed sequence. This model served the industrial age of education well, but it breaks down when we need to meet every learner exactly where they are.

Knowledge graphs change the fundamental data model of education. Instead of treating knowledge as a collection of documents, a knowledge graph treats it as a web of interconnected concepts. "Calculus" is not a folder — it is a node connected to "limits," "derivatives," "integrals," and "real analysis," each of which has its own rich network of prerequisites and applications.

## Why Relationships Are the Missing Ingredient

When a student struggles with integration by parts, a flat LMS can only offer remedial content at the same level. A knowledge graph can ask a deeper question: which prerequisite concept is weak? Is the student shaky on algebraic manipulation? Or do they misunderstand the product rule for derivatives? The graph structure allows the system to trace the dependency chain and intervene at the true point of confusion.

This is what genuine personalization looks like. Not recommending a different video, but reconstructing a learner's current knowledge state as a subgraph and comparing it to the target subgraph — the expert model — to identify the shortest path to mastery.

## Apache AGE and the EduSphere Approach

EduSphere uses Apache AGE, a PostgreSQL extension that adds a native graph layer to a relational database. This means learner events, assessment results, and concept relationships all live in the same ACID-compliant database, queryable with both SQL and Cypher. There is no impedance mismatch between the relational learner data and the graph knowledge model.

Our ontology defines five node types: Concept, Term, Source, Person, and TopicCluster. Every piece of content is anchored to one or more Concept nodes. Every quiz question tests a specific relationship between concepts. This makes the learning graph queryable in ways that feel almost magical in practice.

## Vector Embeddings Meet Graph Traversal

Knowing the graph structure is only half the battle. Semantic search — finding content that is *about* the same thing even when the terminology differs — requires vector embeddings. EduSphere uses pgvector with 768-dimensional nomic-embed-text embeddings to represent every concept node in a high-dimensional semantic space.

The HybridRAG pipeline fuses graph traversal (which concepts are connected?) with vector similarity (which concepts are semantically related?) before passing results to the language model. This combination dramatically reduces hallucination because the LLM is grounded in real graph paths rather than statistical co-occurrence patterns.

## What This Means for Instructors

Instructors can now see, for the first time, which concepts are "bridges" in their course — nodes that many learners must cross to reach higher-order understanding. If 40% of learners who fail the final exam also struggled with a specific prerequisite concept three weeks earlier, the graph makes that pattern visible and actionable.

Personalized learning is not a feature. It is a consequence of storing knowledge in the right data structure.`,
  },
  {
    slug: 'ai-tutoring-chavruta-method',
    title: 'The Chavruta Method: Ancient Pedagogy Meets Modern AI',
    description:
      'The traditional Jewish study partnership method — Chavruta — offers a powerful template for AI tutoring systems that engage learners in Socratic dialogue rather than passive content delivery.',
    keywords: [
      'chavruta', 'AI tutoring', 'Socratic method', 'dialogue-based learning',
      'peer learning', 'LangGraph', 'educational AI', 'active learning',
    ],
    category: 'Pedagogy',
    author: 'Dr. Sarah Cohen',
    authorUrl: 'https://app.edusphere.dev/u/sarah-cohen',
    datePublished: '2026-02-22T09:00:00Z',
    dateModified: '2026-02-22T09:00:00Z',
    readingTimeMinutes: 8,
    bodyMarkdown: `For centuries, scholars in yeshivas across the world learned not by reading alone, nor by listening to lectures, but by arguing. Two students sit across from each other — a Chavruta pair — and wrestle with a text together, each pushing the other to sharpen their reasoning, surface hidden assumptions, and defend their interpretation.

The Chavruta method is not about finding the right answer. It is about developing the cognitive muscles that allow you to find answers on your own. The partner is not a teacher. The partner is a mirror and a sparring partner simultaneously.

## Why Passive Learning Fails

The research on passive learning is unambiguous. Watching a video or reading a text produces far lower retention and transfer than actively engaging with material. The "illusion of knowing" — the feeling that because you can follow an explanation, you understand it — is one of the most robust findings in cognitive psychology. We mistake recognition for recall, and recall for application.

Traditional e-learning doubled down on passive delivery. The video got higher production value. The slides got more animations. But the fundamental model — learner receives, learner absorbs — stayed the same.

## The Chavruta AI: A Genuine Dialogue Partner

EduSphere's Chavruta agent is built on LangGraph.js, a state-machine framework that models the dialogue as a sequence of deliberate moves. The agent does not answer questions directly. It responds to questions with questions. It surfaces contradictions in the learner's own reasoning. It offers a devil's advocate position when the learner seems too comfortable.

The state machine has four primary states: Assess (what does the learner currently believe?), Quiz (probe the belief with a Socratic question), Explain (when genuine confusion is detected, offer a carefully scaffolded hint), and Debate (challenge a correct but shallow answer to deepen understanding).

## The Role of the Knowledge Graph

The Chavruta agent is not freeform. It is grounded in the knowledge graph of the course. When a learner makes a claim about a concept, the agent checks whether that claim aligns with the expected relationships in the graph. This prevents the common failure mode of "confident incorrectness" — where an AI validates a misconception because the language sounds plausible.

The graph provides a truth anchor. The LLM provides the conversational fluency. Together, they create a tutor that can hold a pedagogically sound dialogue across any topic in the curriculum.

## Consent and Transparency

Sending a learner's utterances to a third-party LLM is a significant privacy decision. EduSphere enforces explicit consent at the session level. Before a Chavruta session begins, the learner must acknowledge that their inputs will be processed by the selected AI provider. This is not a dark pattern buried in terms of service — it is a first-class UI interaction.

The Chavruta method works because both partners are present and engaged. Our AI adaptation preserves that spirit: the learner chooses to engage, chooses the depth of dialogue, and retains agency throughout.`,
  },
  {
    slug: 'scorm-future-xapi-lti',
    title: 'Is SCORM Dead? The Future of E-Learning Interoperability Standards',
    description:
      'SCORM has defined e-learning interoperability for 25 years. With xAPI, LTI 1.3, and CMI5 maturing, what does the future of learning standards look like — and does SCORM have any life left?',
    keywords: [
      'SCORM', 'xAPI', 'LTI 1.3', 'CMI5', 'e-learning standards',
      'interoperability', 'learning records', 'LRS', 'IMS Global',
    ],
    category: 'Standards',
    author: 'Prof. Ariel Ben-David',
    authorUrl: 'https://app.edusphere.dev/u/ariel-ben-david',
    datePublished: '2026-03-01T09:00:00Z',
    dateModified: '2026-03-01T09:00:00Z',
    readingTimeMinutes: 10,
    bodyMarkdown: `SCORM — the Sharable Content Object Reference Model — was first published in 2000, when the dominant delivery mechanism for e-learning was a CD-ROM. Its designers solved a real problem: how do you package learning content so that it can run inside any learning management system without requiring custom integration work?

The answer was a ZIP file with a specific manifest, a JavaScript API that content could call to report completion, and a data model that captured exactly six things: completion status, success status, score, time spent, lesson location, and a free-form data string called "suspend data."

That was 2000. It is now 2026.

## What SCORM Gets Right (and Still Gets Right)

SCORM's genius was its simplicity. A content author packages a ZIP, uploads it, and it works. The "it works" guarantee is remarkably durable — SCORM 1.2 content from 2003 still runs in modern LMSs. That kind of backward compatibility is almost unheard of in technology.

For organizations with large libraries of existing SCORM content, the economic argument for migration is weak. The content works. It tracks completion. It satisfies compliance auditors. The question "why should we change?" is entirely reasonable.

## What xAPI Fixes

xAPI (also called Tin Can) inverts the SCORM model. Instead of a fixed six-field data schema, xAPI allows any statement of the form Actor-Verb-Object. "Alice watched video lesson 3 to 72% completion." "Bob scored 8/10 on the Python quiz." "Carol demonstrated the SQL join concept in a live coding exercise."

The richness of xAPI data transforms what learning analytics can do. Learning Record Stores (LRS) like SCORM Cloud or Learning Locker can accumulate learner activity from any application — mobile apps, simulations, physical environments via IoT — not just web-based courseware.

The weakness of xAPI is that it solves a different problem than SCORM. It does not define content packaging or launch protocols. An xAPI-enabled LRS and an xAPI-enabled LMS still need additional agreements to interoperate.

## CMI5: The Bridge

CMI5 is the least-known but arguably most important standard in this space. It combines xAPI's rich statement vocabulary with SCORM's launch and packaging conventions. A CMI5 package is a ZIP file (like SCORM) that launches via a defined protocol, but reports its data as xAPI statements to an LRS.

CMI5 essentially defines the subset of xAPI statements that an LMS must be able to interpret, creating a meaningful interoperability contract without forcing everyone to agree on every possible statement type.

## LTI 1.3: The Deep Link Revolution

IMS Global's Learning Tools Interoperability (LTI) standard takes a different approach entirely. Rather than packaging content inside a ZIP, LTI defines a secure OAuth 2.0-based protocol for an LMS to launch an external tool and receive back grades and completion data.

LTI 1.3 with Deep Linking allows a learner to navigate directly into a specific activity within an external tool — a specific lesson, a specific simulation, a specific assessment — rather than always landing on the tool's home page. This is transformative for sophisticated content providers who maintain their own learning environments.

## EduSphere's Pragmatic Position

EduSphere exports content as SCORM 2004 (for legacy LMS compatibility), supports LTI 1.3 deep linking for tool embedding, and records all internal activity as xAPI statements to its own LRS. This is not fence-sitting — it is a recognition that different use cases genuinely require different standards.

The organizations most harmed by standards debates are those that pick a winner and bet everything on it. The pragmatic approach is to be fluent in all three.`,
  },
  {
    slug: 'compliance-learning-automation',
    title: 'Automating Compliance Training at Scale',
    description:
      'Manual compliance training assignment is error-prone and costly. Learn how AI-driven automation, dynamic curriculum mapping, and audit-ready reporting transform compliance programs for enterprises.',
    keywords: [
      'compliance training', 'automation', 'LMS', 'regulatory training',
      'audit trail', 'mandatory training', 'enterprise learning', 'GDPR training',
    ],
    category: 'Enterprise',
    author: 'Yonatan Shapiro',
    authorUrl: 'https://app.edusphere.dev/u/yonatan-shapiro',
    datePublished: '2026-03-08T09:00:00Z',
    dateModified: '2026-03-08T09:00:00Z',
    readingTimeMinutes: 9,
    bodyMarkdown: `Every employee in a financial services firm must complete anti-money-laundering training annually. Every software engineer at a healthcare company must pass HIPAA awareness training before accessing patient data systems. Every new hire anywhere in Europe must complete GDPR awareness training within 30 days of joining.

These are not suggestions. These are legal obligations with teeth: fines, regulatory sanctions, and personal liability for compliance officers who cannot demonstrate that training happened. The compliance training problem is fundamentally a data problem, not a learning design problem.

## The Manual Assignment Trap

Most organizations still manage compliance training assignment through spreadsheets, calendar reminders, and semi-automated email campaigns. An HR system notifies a compliance administrator when a new employee joins. The administrator looks up which role the employee holds. They consult a matrix that maps roles to required training. They manually enroll the employee in the relevant courses.

This process is auditable in theory and chaotic in practice. Employees change roles. Regulations change requirements. The matrix goes out of date. Deadlines slip. When auditors arrive, the compliance officer spends days reconstructing who was assigned what and when — from logs that were never designed to answer that question.

## What Automation Actually Requires

Automating compliance training is not simply connecting an HRIS to an LMS via a webhook. True automation requires four interconnected capabilities.

First, a dynamic role-to-curriculum mapping that updates automatically when regulations change. When a new data privacy law takes effect, every employee in a covered role must be enrolled — not when someone remembers to update a spreadsheet, but immediately.

Second, real-time enrollment based on role changes. When an employee moves from engineering to sales, the system must automatically withdraw them from the engineering-specific compliance tracks and enroll them in the sales-specific tracks. This happens at the moment of the HRIS update, not at the next manual review cycle.

Third, escalating reminder and escalation workflows. A first reminder 30 days before deadline. A second reminder 7 days before. A notification to the manager at 3 days. An escalation to HR at the deadline. None of this should require human scheduling.

Fourth, audit-ready reporting. Every enrollment, every completion, every failed attempt, every deadline extension must be stored with immutable timestamps and user attribution. When auditors request evidence, the system must be able to produce a complete, queryable compliance record in minutes.

## The Role of AI in Compliance

AI adds a dimension that pure automation cannot: intelligent gap detection. EduSphere's gap analysis engine compares each employee's current knowledge state — as inferred from assessment performance — against the minimum competency profile required for their role. If an employee completes a mandatory training module but scores below threshold on the embedded assessment, the system does not mark them as compliant. It flags them for remediation and schedules a reassessment.

This distinction — between completing training and demonstrating competency — is increasingly important as regulators move away from "attendance-based" compliance toward "evidence-based" compliance. Completion certificates are necessary but no longer sufficient.

## Building a Culture, Not Just a Checkbox

The organizations that get compliance training right treat it as a cultural investment, not a legal minimum. When compliance content is well-designed, relevant to actual job responsibilities, and delivered at the moment of need rather than on a fixed annual calendar, employees actually learn from it. The compliance program becomes a professional development asset rather than an annual tax on employees' time.

Automation enables this shift by removing the administrative burden that forces compliance programs to be minimal and infrequent. When enrollment and tracking are automatic, the compliance team can focus on curriculum quality, instructional design, and measuring real-world impact.`,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
