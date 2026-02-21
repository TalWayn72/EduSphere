import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Screens
import HomeScreen from '../screens/HomeScreen';
import CoursesScreen from '../screens/CoursesScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import DiscussionsScreen from '../screens/DiscussionsScreen';
import AITutorScreen from '../screens/AITutorScreen';
import KnowledgeGraphScreen from '../screens/KnowledgeGraphScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  Main: undefined;
  CourseDetail: { courseId: string };
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Courses: undefined;
  Discussions: undefined;
  AITutor: undefined;
  KnowledgeGraph: undefined;
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
          } else {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
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
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('common:settings', { defaultValue: 'Settings' }) }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
