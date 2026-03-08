import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery, gql } from '@apollo/client';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '../lib/theme';
import { DEV_MODE } from '../lib/mock-mobile-data';

const SKILL_TREE_QUERY = gql`
  query SkillTree($courseId: ID!) {
    skillTree(courseId: $courseId) {
      nodes {
        id
        label
        type
        masteryLevel
        connections
      }
    }
  }
`;

type MasteryLevel = 'NONE' | 'ATTEMPTED' | 'FAMILIAR' | 'PROFICIENT' | 'MASTERED';

export interface SkillNode {
  id: string;
  label: string;
  type: string;
  masteryLevel: MasteryLevel;
  connections?: string[];
}

const MOCK_NODES: SkillNode[] = [
  { id: 'sn-1', label: 'Critical Thinking', type: 'SKILL', masteryLevel: 'MASTERED', connections: ['sn-2'] },
  { id: 'sn-2', label: 'Logical Fallacies', type: 'SKILL', masteryLevel: 'PROFICIENT', connections: ['sn-3'] },
  { id: 'sn-3', label: 'Deductive Reasoning', type: 'SKILL', masteryLevel: 'FAMILIAR', connections: [] },
  { id: 'sn-4', label: 'Inductive Reasoning', type: 'SKILL', masteryLevel: 'ATTEMPTED', connections: [] },
  { id: 'sn-5', label: 'Abductive Reasoning', type: 'SKILL', masteryLevel: 'NONE', connections: [] },
];

export function masteryColor(level: MasteryLevel): string {
  switch (level) {
    case 'MASTERED': return COLORS.masteryMastered;
    case 'PROFICIENT': return COLORS.masteryProficient;
    case 'FAMILIAR': return COLORS.masteryFamiliar;
    case 'ATTEMPTED': return COLORS.masteryAttempted;
    default: return COLORS.masteryNone;
  }
}

export function masteryPercent(level: MasteryLevel): number {
  const map: Record<MasteryLevel, number> = {
    NONE: 0, ATTEMPTED: 25, FAMILIAR: 50, PROFICIENT: 75, MASTERED: 100,
  };
  return map[level] ?? 0;
}

type SkillTreeRouteProp = RouteProp<RootStackParamList, 'SkillTree'>;

export const SkillTreeScreen: React.FC = () => {
  const route = useRoute<SkillTreeRouteProp>();
  const { courseId } = route.params;
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);

  const { data, loading } = useQuery(SKILL_TREE_QUERY, {
    variables: { courseId },
    skip: DEV_MODE,
  });

  const nodes: SkillNode[] = DEV_MODE
    ? MOCK_NODES
    : (data?.skillTree?.nodes ?? []);

  if (loading && !DEV_MODE) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={nodes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.nodeCard, { borderLeftColor: masteryColor(item.masteryLevel) }]}
            onPress={() => setSelectedNode(item)}
            testID={`skill-node-${item.id}`}
          >
            <View style={styles.nodeInfo}>
              <Text style={styles.nodeLabel}>{item.label}</Text>
              <Text style={styles.nodeType}>{item.type}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: masteryColor(item.masteryLevel) + '20' }]}>
              <Text style={[styles.badgeText, { color: masteryColor(item.masteryLevel) }]}>
                {item.masteryLevel}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <Modal
        visible={selectedNode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNode(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {selectedNode && (
              <>
                <Text style={styles.modalTitle}>{selectedNode.label}</Text>
                <Text style={styles.modalType}>{selectedNode.type}</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${masteryPercent(selectedNode.masteryLevel)}%`,
                        backgroundColor: masteryColor(selectedNode.masteryLevel),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.masteryLabel}>
                  {selectedNode.masteryLevel} · {masteryPercent(selectedNode.masteryLevel)}%
                </Text>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedNode(null)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: SPACING.lg, gap: SPACING.sm },
  nodeCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    ...SHADOW.sm,
  },
  nodeInfo: { flex: 1 },
  nodeLabel: { fontSize: FONT.base, fontWeight: FONT.semibold, color: COLORS.textPrimary },
  nodeType: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 2 },
  badge: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  badgeText: { fontSize: FONT.xs, fontWeight: FONT.semibold },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xxl,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: FONT.xl, fontWeight: FONT.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  modalType: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  masteryLabel: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  closeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontWeight: FONT.semibold, fontSize: FONT.base },
});
