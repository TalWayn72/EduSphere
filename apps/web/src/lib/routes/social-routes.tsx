import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { guarded } from './helpers';

// ── Lazy loaded social & collaboration pages ─────────────────────────────────
const DiscussionsPage = lazy(() =>
  import('@/pages/DiscussionsPage').then((m) => ({ default: m.DiscussionsPage }))
);
const DiscussionDetailPage = lazy(() =>
  import('@/pages/DiscussionDetailPage').then((m) => ({
    default: m.DiscussionDetailPage,
  }))
);
const SocialFeedPage = lazy(() =>
  import('@/pages/SocialFeedPage').then((m) => ({ default: m.SocialFeedPage }))
);
const UserSearchPage = lazy(() =>
  import('@/pages/UserSearchPage').then((m) => ({
    default: m.UserSearchPage,
  }))
);
const GroupChallengesPage = lazy(() =>
  import('@/pages/GroupChallengesPage').then((m) => ({
    default: m.GroupChallengesPage,
  }))
);
const ChallengeDetailPage = lazy(() =>
  import('@/pages/ChallengeDetailPage').then((m) => ({
    default: m.ChallengeDetailPage,
  }))
);
const PeerMatchingPage = lazy(() =>
  import('@/pages/PeerMatchingPage').then((m) => ({
    default: m.PeerMatchingPage,
  }))
);
const ChavrutaPartnerPage = lazy(() =>
  import('@/pages/chavruta/ChavrutaPartnerPage').then((m) => ({
    default: m.ChavrutaPartnerPage,
  }))
);
const MentorDiscoveryPage = lazy(() =>
  import('@/pages/mentor/MentorDiscoveryPage').then((m) => ({
    default: m.MentorDiscoveryPage,
  }))
);
const CohortInsightsPage = lazy(() =>
  import('@/pages/CohortInsightsPage').then((m) => ({
    default: m.CohortInsightsPage,
  }))
);
const CollaborationPage = lazy(() =>
  import('@/pages/CollaborationPage').then((m) => ({
    default: m.CollaborationPage,
  }))
);
const CollaborationSessionPage = lazy(() =>
  import('@/pages/CollaborationSessionPage').then((m) => ({
    default: m.CollaborationSessionPage,
  }))
);
const AnnotationsPage = lazy(() =>
  import('@/pages/AnnotationsPage').then((m) => ({
    default: m.AnnotationsPage,
  }))
);

/**
 * Social, collaboration, and community routes.
 */
export const socialRoutes: RouteObject[] = [
  { path: '/discussions', element: guarded(<DiscussionsPage />) },
  { path: '/discussions/:id', element: guarded(<DiscussionDetailPage />) },
  // Social Feed — activity stream from followed users
  { path: '/social', element: guarded(<SocialFeedPage />) },
  { path: '/social-feed', element: guarded(<SocialFeedPage />) },
  // People search — find and follow other learners
  { path: '/people', element: guarded(<UserSearchPage />) },
  // Group Challenges — competitive learning challenges
  { path: '/challenges', element: guarded(<GroupChallengesPage />) },
  { path: '/challenges/:id', element: guarded(<ChallengeDetailPage />) },
  // Peer Matching — AI-powered learner matching
  { path: '/peer-matching', element: guarded(<PeerMatchingPage />) },
  // Chavruta Partner Finder — find a human debate partner
  { path: '/chavruta/partner', element: guarded(<ChavrutaPartnerPage />) },
  // Mentor Discovery — find a mentor by knowledge path topology
  { path: '/mentor/discover/:courseId?', element: guarded(<MentorDiscoveryPage />) },
  // Cohort Insights — GAP-7: cross-cohort institutional knowledge
  { path: '/cohort-insights', element: guarded(<CohortInsightsPage />) },
  // Collaboration
  { path: '/collaboration', element: guarded(<CollaborationPage />) },
  { path: '/collaboration/session', element: guarded(<CollaborationSessionPage />) },
  { path: '/annotations', element: guarded(<AnnotationsPage />) },
];
