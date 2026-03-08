import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

const MY_ONBOARDING_STATE_QUERY = gql`
  query MyOnboardingState {
    myOnboardingState {
      userId currentStep totalSteps completed skipped role
    }
  }
`;

const UPDATE_ONBOARDING_STEP_MUTATION = gql`
  mutation UpdateOnboardingStep($input: UpdateOnboardingStepInput!) {
    updateOnboardingStep(input: $input) {
      userId currentStep totalSteps completed skipped
    }
  }
`;

const COMPLETE_ONBOARDING_MUTATION = gql`
  mutation CompleteOnboarding {
    completeOnboarding { userId completed }
  }
`;

const SKIP_ONBOARDING_MUTATION = gql`
  mutation SkipOnboarding {
    skipOnboarding { userId skipped }
  }
`;

// Pure helpers (exported for testing)
export function getStepTitle(step: number): string {
  const titles: Record<number, string> = {
    1: 'Set up your profile',
    2: 'Choose your interests',
    3: 'Start learning',
  };
  return titles[step] ?? `Step ${step}`;
}

export function validateDisplayName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 50;
}

interface OnboardingScreenProps {
  navigation: { replace: (screen: string) => void };
}

export function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const { loading } = useQuery(MY_ONBOARDING_STATE_QUERY, {
    onCompleted: (data: { myOnboardingState?: { completed?: boolean; skipped?: boolean; currentStep?: number } }) => {
      if (data?.myOnboardingState?.completed || data?.myOnboardingState?.skipped) {
        navigation.replace('Main');
      } else if (data?.myOnboardingState?.currentStep) {
        setStep(data.myOnboardingState.currentStep);
      }
    },
  });

  const [updateStep] = useMutation(UPDATE_ONBOARDING_STEP_MUTATION);
  const [completeOnboarding] = useMutation(COMPLETE_ONBOARDING_MUTATION);
  const [skipOnboarding] = useMutation(SKIP_ONBOARDING_MUTATION);

  const topics = ['Torah Study', 'Talmud', 'Halacha', 'Jewish History', 'Hebrew', 'Prayer'];
  const totalSteps = 3;

  const handleNext = useCallback(async () => {
    if (step === 1 && !validateDisplayName(displayName)) {
      Alert.alert('Please enter your name (2–50 characters)');
      return;
    }
    try {
      await updateStep({ variables: { input: { step, data: { displayName, selectedTopics } } } });
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        await completeOnboarding();
        navigation.replace('Main');
      }
    } catch {
      Alert.alert('Something went wrong, please try again');
    }
  }, [step, displayName, selectedTopics, updateStep, completeOnboarding, navigation, totalSteps]);

  const handleSkip = useCallback(async () => {
    await skipOnboarding();
    navigation.replace('Main');
  }, [skipOnboarding, navigation]);

  const toggleTopic = useCallback((topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : prev.length < 3 ? [...prev, topic] : prev
    );
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Progress dots */}
      <View style={styles.progressDots}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View key={i} style={[styles.dot, i < step && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.title}>{getStepTitle(step)}</Text>

      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="How should we call you?"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      )}

      {step === 2 && (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Pick up to 3 topics you want to learn</Text>
          <View style={styles.topicGrid}>
            {topics.map((topic) => (
              <TouchableOpacity
                key={topic}
                style={[
                  styles.topicChip,
                  selectedTopics.includes(topic) && styles.topicChipSelected,
                ]}
                onPress={() => toggleTopic(topic)}
              >
                <Text style={[
                  styles.topicText,
                  selectedTopics.includes(topic) && styles.topicTextSelected,
                ]}>
                  {topic}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.section}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.subtitle}>
            You're ready to start learning! Tap below to go to your dashboard.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
        <Text style={styles.primaryButtonText}>
          {step === totalSteps ? 'Start Learning' : 'Continue'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#F8F9FA', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressDots: { flexDirection: 'row', gap: 8, marginBottom: 32, marginTop: 48 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: '#6366F1' },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 24, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  section: { width: '100%', marginBottom: 24, alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, alignSelf: 'flex-start' },
  input: { width: '100%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1A1A2E', backgroundColor: '#FFF' },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  topicChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF' },
  topicChipSelected: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  topicText: { fontSize: 13, color: '#374151' },
  topicTextSelected: { color: '#6366F1', fontWeight: '600' },
  emoji: { fontSize: 48, marginBottom: 16 },
  primaryButton: { width: '100%', backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  skipText: { fontSize: 14, color: '#9CA3AF' },
});
