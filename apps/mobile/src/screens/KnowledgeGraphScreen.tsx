import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView } from 'react-native';
import { useQuery, gql } from '@apollo/client';
import { DEV_MODE, MOCK_GRAPH_NODES } from '../lib/mock-mobile-data';

const KNOWLEDGE_GRAPH_QUERY = gql`
  query MobileKnowledgeGraph($contentId: ID!) {
    conceptsForContent(contentId: $contentId) {
      nodes { id label type description }
      edges { from to type }
    }
  }
`;

const TYPE_COLORS: Record<string, string> = { CONCEPT: '#007AFF', PERSON: '#34C759', SOURCE: '#AF52DE', TERM: '#FF9500' };
const TYPE_ICONS: Record<string, string> = { CONCEPT: '💡', PERSON: '👤', SOURCE: '📚', TERM: '🏷' };

type NodeType = 'CONCEPT' | 'PERSON' | 'SOURCE' | 'TERM';

interface GraphNode { id: string; label: string; type: NodeType; description?: string; connections?: number; }

export default function KnowledgeGraphScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NodeType | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const { data } = useQuery(KNOWLEDGE_GRAPH_QUERY, { variables: { contentId: 'content-1' }, skip: DEV_MODE });

  const nodes: GraphNode[] = DEV_MODE ? MOCK_GRAPH_NODES : (data?.conceptsForContent?.nodes ?? []);

  const filteredNodes = nodes.filter((n) => {
    const matchesSearch = !searchQuery || n.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || n.type === typeFilter;
    return matchesSearch && matchesType;
  });
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 Search concepts..."
          clearButtonMode="while-editing"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
        {(['CONCEPT', 'PERSON', 'SOURCE', 'TERM'] as const).map((type) => (
          <TouchableOpacity key={type} onPress={() => setTypeFilter(typeFilter === type ? null : type)}
            style={[styles.filterChip, { borderColor: TYPE_COLORS[type], backgroundColor: typeFilter === type ? TYPE_COLORS[type] + '20' : 'transparent' }]}
          >
            <Text style={[styles.filterChipText, { color: TYPE_COLORS[type] }]}>{TYPE_ICONS[type]} {type}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>{filteredNodes.length} of {nodes.length} concepts{DEV_MODE && ' (mock)'}</Text>
      </View>
      <FlatList
        data={filteredNodes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.nodeCard} onPress={() => setSelectedNode(item)}>
            <View style={[styles.nodeTypeBadge, { backgroundColor: TYPE_COLORS[item.type] + '20' }]}>
              <Text style={styles.nodeTypeIcon}>{TYPE_ICONS[item.type]}</Text>
            </View>
            <View style={styles.nodeInfo}>
              <Text style={styles.nodeLabel}>{item.label}</Text>
              <Text style={[styles.nodeType, { color: TYPE_COLORS[item.type] }]}>
                {item.type}{item.connections !== undefined ? ` · ${item.connections} connections` : ''}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No concepts match your search</Text></View>}
      />
      <Modal visible={selectedNode !== null} transparent animationType="slide" onRequestClose={() => setSelectedNode(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNode && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalIcon}>{TYPE_ICONS[selectedNode.type]}</Text>
                  <View style={styles.modalTitleGroup}>
                    <Text style={styles.modalTitle}>{selectedNode.label}</Text>
                    <Text style={[styles.modalType, { color: TYPE_COLORS[selectedNode.type] }]}>{selectedNode.type}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedNode(null)} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                {selectedNode.description && (
                  <Text style={styles.modalDescription}>{selectedNode.description}</Text>
                )}
                {selectedNode.connections !== undefined && (
                  <Text style={styles.modalConnections}>🔗 {selectedNode.connections} connections in the knowledge graph</Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchContainer: { padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  searchInput: { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16 },
  filtersScroll: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  filters: { padding: 10, gap: 8, flexDirection: 'row' },
  filterChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  statsBar: { paddingHorizontal: 16, paddingVertical: 8 },
  statsText: { fontSize: 12, color: '#999' },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  nodeCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  nodeTypeBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  nodeTypeIcon: { fontSize: 20 },
  nodeInfo: { flex: 1 },
  nodeLabel: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  nodeType: { fontSize: 12, fontWeight: '500' },
  chevron: { fontSize: 22, color: '#ccc' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  modalIcon: { fontSize: 32, marginRight: 12 },
  modalTitleGroup: { flex: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalType: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  closeButton: { padding: 4 },
  closeButtonText: { fontSize: 20, color: '#999' },
  modalDescription: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 12 },
  modalConnections: { fontSize: 13, color: '#666', backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 },
});