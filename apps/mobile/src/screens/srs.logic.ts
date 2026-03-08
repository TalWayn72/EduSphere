export interface SrsCard {
  id: string;
  front: string;
  back: string;
  dueDate: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
}

export interface SessionStats {
  total: number;
  reviewed: number;
  correct: number; // quality >= 3
}

export function computeSessionStats(
  ratings: { cardId: string; quality: number }[],
): SessionStats {
  return {
    total: ratings.length,
    reviewed: ratings.length,
    correct: ratings.filter((r) => r.quality >= 3).length,
  };
}

export function advanceCard(current: number, total: number): number | null {
  return current + 1 < total ? current + 1 : null;
}

export function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate);
  const today = new Date();
  const diff = Math.floor(
    (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff <= 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff} days`;
}

export function computeLevel(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
}
