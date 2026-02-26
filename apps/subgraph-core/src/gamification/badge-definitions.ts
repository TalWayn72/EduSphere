/**
 * Platform-wide badge definitions seeded at startup.
 * conditionType maps to the metric tracked in BadgeService.
 */

export interface BadgeDefinition {
  name: string;
  description: string;
  icon: string;
  category: 'STREAK' | 'COMPLETION' | 'ENGAGEMENT' | 'SOCIAL';
  pointsReward: number;
  conditionType: string;
  conditionValue: number;
}

export const PLATFORM_BADGES: readonly BadgeDefinition[] = [
  {
    name: 'First Step',
    description: 'Complete your first course',
    icon: '🎓',
    category: 'COMPLETION',
    pointsReward: 100,
    conditionType: 'courses_completed',
    conditionValue: 1,
  },
  {
    name: 'Scholar',
    description: 'Complete 5 courses',
    icon: '📚',
    category: 'COMPLETION',
    pointsReward: 500,
    conditionType: 'courses_completed',
    conditionValue: 5,
  },
  {
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: '🔥',
    category: 'STREAK',
    pointsReward: 200,
    conditionType: 'streak_days',
    conditionValue: 7,
  },
  {
    name: 'Month Master',
    description: 'Maintain a 30-day learning streak',
    icon: '⚡',
    category: 'STREAK',
    pointsReward: 1000,
    conditionType: 'streak_days',
    conditionValue: 30,
  },
  {
    name: 'Annotator',
    description: 'Create 10 annotations',
    icon: '✍️',
    category: 'ENGAGEMENT',
    pointsReward: 150,
    conditionType: 'annotations_created',
    conditionValue: 10,
  },
  {
    name: 'Deep Thinker',
    description: 'Create 100 annotations',
    icon: '🧠',
    category: 'ENGAGEMENT',
    pointsReward: 500,
    conditionType: 'annotations_created',
    conditionValue: 100,
  },
  {
    name: 'Knowledge Sharer',
    description: 'Contribute 5 concepts to the knowledge graph',
    icon: '🕸️',
    category: 'SOCIAL',
    pointsReward: 300,
    conditionType: 'concepts_contributed',
    conditionValue: 5,
  },
] as const;

/** Points awarded per NATS event type */
export const POINT_AWARDS: Readonly<Record<string, number>> = {
  'course.completed': 100,
  'annotation.created': 10,
  'quiz.passed': 50,
  'streak.milestone.7': 200,
  'streak.milestone.30': 1000,
  'concept.contributed': 30,
} as const;
