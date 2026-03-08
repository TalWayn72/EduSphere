import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, gql } from '@apollo/client';
import { advanceCard, computeSessionStats } from './srs.logic';

const SRS_DUE_CARDS_QUERY = gql`
  query SrsDueCards {
    myDueSrsCards {
      id front back dueDate intervalDays easeFactor repetitions
    }
  }
`;

const SUBMIT_SRS_RATING_MUTATION = gql`
  mutation SubmitSrsRating($cardId: ID!, $quality: Int!) {
    submitSrsRating(cardId: $cardId, quality: $quality) {
      id dueDate intervalDays easeFactor repetitions
    }
  }
`;

type Rating = { cardId: string; quality: number };

export function SrsReviewScreen() {
  const [paused, setPaused] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [sessionDone, setSessionDone] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      setPaused(false);
      return () => setPaused(true);
    }, []),
  );

  const { data, loading } = useQuery(SRS_DUE_CARDS_QUERY, { skip: paused });
  const [submitRating] = useMutation(SUBMIT_SRS_RATING_MUTATION);

  const cards: { id: string; front: string; back: string }[] =
    data?.myDueSrsCards ?? [];

  const flipCard = useCallback(() => {
    const toValue = isFlipped ? 0 : 1;
    Animated.timing(flipAnim, {
      toValue, duration: 300, useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  }, [isFlipped, flipAnim]);

  const handleRate = useCallback(
    (quality: number) => {
      const card = cards[currentIndex];
      if (!card) return;
      void submitRating({ variables: { cardId: card.id, quality } });
      const newRatings = [...ratings, { cardId: card.id, quality }];
      setRatings(newRatings);
      const next = advanceCard(currentIndex, cards.length);
      if (next === null) {
        setSessionDone(true);
      } else {
        setCurrentIndex(next);
        setIsFlipped(false);
        flipAnim.setValue(0);
      }
    },
    [cards, currentIndex, ratings, submitRating, flipAnim],
  );

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.emoji}>🎉</Text>
        <Text style={s.emptyTitle}>No cards due today</Text>
        <Text style={s.emptyText}>Check back tomorrow!</Text>
      </View>
    );
  }

  if (sessionDone) {
    const stats = computeSessionStats(ratings);
    return (
      <View style={s.centered}>
        <Text style={s.emoji}>✅</Text>
        <Text style={s.emptyTitle}>Session Complete!</Text>
        <Text style={s.subText}>
          {stats.correct} / {stats.total} correct
        </Text>
      </View>
    );
  }

  const card = cards[currentIndex];
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <View style={s.container}>
      <Text style={s.progress}>{currentIndex + 1} / {cards.length}</Text>
      <TouchableOpacity onPress={flipCard} activeOpacity={0.9}>
        <Animated.View style={[s.card, { transform: [{ rotateY: frontRotate }] }]}>
          <Text style={s.cardLabel}>Front</Text>
          <Text style={s.cardText}>{card.front}</Text>
        </Animated.View>
        <Animated.View style={[s.card, s.cardBack, { transform: [{ rotateY: backRotate }] }]}>
          <Text style={s.cardLabel}>Back</Text>
          <Text style={s.cardText}>{card.back}</Text>
        </Animated.View>
      </TouchableOpacity>
      {isFlipped && (
        <View style={s.ratingRow}>
          {([['Again', 1], ['Hard', 2], ['Good', 3], ['Easy', 5]] as [string, number][]).map(
            ([label, q]) => (
              <TouchableOpacity key={label} style={[s.rateBtn, s[`rate${label}` as keyof typeof s] as object]} onPress={() => handleRate(q)}>
                <Text style={s.rateBtnText}>{label}</Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      )}
      {!isFlipped && <Text style={s.hint}>Tap card to reveal answer</Text>}
    </View>
  );
}

export default SrsReviewScreen;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  progress: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 16 },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 32, minHeight: 200,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    backfaceVisibility: 'hidden',
  },
  cardBack: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#EEF2FF' },
  cardLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 },
  cardText: { fontSize: 20, fontWeight: '600', color: '#1A1A2E', textAlign: 'center' },
  hint: { textAlign: 'center', color: '#9CA3AF', marginTop: 16, fontSize: 13 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 8 },
  rateBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  rateBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  rateAgain: { backgroundColor: '#EF4444' },
  rateHard: { backgroundColor: '#F97316' },
  rateGood: { backgroundColor: '#10B981' },
  rateEasy: { backgroundColor: '#6366F1' },
  emoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  subText: { fontSize: 16, color: '#6B7280', marginTop: 8 },
});
