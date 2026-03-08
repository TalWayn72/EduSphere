import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../lib/theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import CoursesScreen from '../screens/CoursesScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import CourseViewerScreen from '../screens/CourseViewerScreen';
import DiscussionsScreen from '../screens/DiscussionsScreen';
import AITutorScreen from '../screens/AITutorScreen';
import AIChatScreen from '../screens/AIChatScreen';
import KnowledgeGraphScreen from '../screens/KnowledgeGraphScreen';
import MyBadgesScreen from '../screens/MyBadgesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { LiveSessionsScreen } from '../screens/LiveSessionsScreen';
import { SkillTreeScreen } from '../screens/SkillTreeScreen';
import { ModelViewerScreen } from '../screens/ModelViewerScreen';
import GamificationScreen from '../screens/GamificationScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import SrsReviewScreen from '../screens/SrsReviewScreen';
import CertificatesScreen from '../screens/CertificatesScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  CourseDetail: { courseId: string };
  CourseViewer: { courseId: string };
  AIChat: { sessionId: string };
  Settings: undefined;
  LiveSessions: undefined;
  SkillTree: { courseId: string };
  ModelViewer: { modelUrl?: string; modelTitle?: string };
  SrsReview: undefined;
  Certificates: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Courses: undefined;
  Discussions: undefined;
  AITutor: undefined;
  KnowledgeGraph: undefined;
  Gamification: undefined;
  Badges: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { t } = useTranslation('nav');
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Courses') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Discussions') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'AITutor') {
            iconName = focused ? 'bulb' : 'bulb-outline';
          } else if (route.name === 'KnowledgeGraph') {
            iconName = focused ? 'git-network' : 'git-network-outline';
          } else if (route.name === 'Gamification') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Badges') {
            iconName = focused ? 'ribbon' : 'ribbon-outline';
          } else {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('home') }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesScreen}
        options={{ title: t('courses') }}
      />
      <Tab.Screen
        name="Discussions"
        component={DiscussionsScreen}
        options={{ title: t('discussions') }}
      />
      <Tab.Screen
        name="AITutor"
        component={AITutorScreen}
        options={{ title: t('aiTutor') }}
      />
      <Tab.Screen
        name="KnowledgeGraph"
        component={KnowledgeGraphScreen}
        options={{ title: t('graph') }}
      />
      <Tab.Screen
        name="Gamification"
        component={GamificationScreen}
        options={{ title: 'Gamification' }}
      />
      <Tab.Screen
        name="Badges"
        component={MyBadgesScreen}
        options={{ title: t('badges', { defaultValue: 'Badges' }) }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('profile') }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { t } = useTranslation('courses');
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CourseDetail"
          component={CourseDetailScreen}
          options={{ title: t('courseDetails') }}
        />
        <Stack.Screen
          name="CourseViewer"
          component={CourseViewerScreen}
          options={{ title: t('courseDetails') }}
        />
        <Stack.Screen
          name="AIChat"
          component={AIChatScreen}
          options={{ title: 'AI Chat' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: t('common:settings', { defaultValue: 'Settings' }),
          }}
        />
        <Stack.Screen
          name="LiveSessions"
          component={LiveSessionsScreen}
          options={{ title: 'Live Sessions' }}
        />
        <Stack.Screen
          name="SkillTree"
          component={SkillTreeScreen}
          options={{ title: 'Skill Tree' }}
        />
        <Stack.Screen
          name="ModelViewer"
          component={ModelViewerScreen}
          options={{ title: '3D Model' }}
        />
        <Stack.Screen
          name="SrsReview"
          component={SrsReviewScreen}
          options={{ title: 'SRS Review' }}
        />
        <Stack.Screen
          name="Certificates"
          component={CertificatesScreen}
          options={{ title: 'Certificates' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
