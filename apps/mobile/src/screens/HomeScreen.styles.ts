/**
 * HomeScreen styles — extracted from HomeScreen.tsx for file size compliance.
 */
import { StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../lib/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xxl,
    backgroundColor: COLORS.bgCard,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    ...SHADOW.md,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FONT.sm, color: COLORS.textSecondary },
  userName: {
    fontSize: FONT.xxl,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  streakFlame: { fontSize: FONT.lg },
  streakCount: {
    fontSize: FONT.base,
    fontWeight: FONT.semibold,
    color: COLORS.warning,
    marginLeft: 4,
  },
  streakLabel: { fontSize: FONT.sm, color: COLORS.textSecondary },
  devBadge: {
    backgroundColor: COLORS.warning,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  devBadgeText: { color: 'white', fontSize: FONT.xs, fontWeight: FONT.bold },
  sectionTitle: {
    fontSize: FONT.lg,
    fontWeight: FONT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  statCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    width: '47%',
    borderTopWidth: 3,
    ...SHADOW.sm,
  },
  statValue: { fontSize: 28, fontWeight: FONT.bold, marginBottom: 4 },
  statUnit: { fontSize: FONT.md, fontWeight: FONT.regular },
  statLabel: { fontSize: 13, color: COLORS.textSecondary },
  courseCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    ...SHADOW.sm,
  },
  courseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  courseTitle: {
    fontSize: FONT.base,
    fontWeight: FONT.semibold,
    flex: 1,
    marginRight: SPACING.sm,
  },
  courseAccessed: { fontSize: FONT.sm, color: COLORS.textMuted },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    width: 35,
    textAlign: 'right',
  },
});

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
