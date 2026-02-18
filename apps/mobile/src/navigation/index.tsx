import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import CoursesScreen from '../screens/CoursesScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import DiscussionsScreen from '../screens/DiscussionsScreen';
import AITutorScreen from '../screens/AITutorScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type RootStackParamList = {
  Main: undefined;
  CourseDetail: { courseId: string };
};

export type MainTabParamList = {
  Courses: undefined;
  Discussions: undefined;
  AITutor: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Courses') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Discussions') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'AITutor') {
            iconName = focused ? 'logo-android' : 'logo-android';
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
        name="Courses"
        component={CoursesScreen}
        options={{ title: 'Courses' }}
      />
      <Tab.Screen
        name="Discussions"
        component={DiscussionsScreen}
        options={{ title: 'Forum' }}
      />
      <Tab.Screen
        name="AITutor"
        component={AITutorScreen}
        options={{ title: 'AI Tutor' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
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
          options={{ title: 'Course Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
