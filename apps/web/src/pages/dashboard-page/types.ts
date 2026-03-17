export interface MockCourse {
  id: string;
  title: string;
  progress: number;
  lastStudied: string;
  instructor: string;
}

export interface MockActivity {
  id: string;
  icon: string;
  action: string;
  timeAgo: string;
}

export interface MockMasteryItem {
  topic: string;
  level: 'none' | 'attempted' | 'familiar' | 'proficient' | 'mastered';
}
