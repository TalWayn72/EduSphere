import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

export interface DeepLinkRoute {
  screen: string;
  params?: Record<string, any>;
}

export class DeepLinkingService {
  private prefix = Linking.createURL('/');

  getInitialURL(): Promise<string | null> {
    return Linking.getInitialURL();
  }

  parseURL(url: string): DeepLinkRoute | null {
    const { path, queryParams } = Linking.parse(url);

    if (!path) {
      return null;
    }

    // Parse routes
    // Format: edusphere://course/123
    // Format: edusphere://discussion/456
    // Format: edusphere://lesson/789

    const pathParts = path.split('/').filter(Boolean);

    if (pathParts.length === 0) {
      return { screen: 'Home' };
    }

    const [type, id] = pathParts;

    switch (type) {
      case 'course':
        return {
          screen: 'CourseDetail',
          params: { courseId: id, ...(queryParams ?? {}) },
        };

      case 'lesson':
        return {
          screen: 'LessonDetail',
          params: { lessonId: id, ...(queryParams ?? {}) },
        };

      case 'discussion':
        return {
          screen: 'DiscussionDetail',
          params: { discussionId: id, ...(queryParams ?? {}) },
        };

      case 'profile':
        return {
          screen: 'Profile',
          params: queryParams ?? undefined,
        };

      case 'ai-tutor':
        return {
          screen: 'AITutor',
          params: { sessionId: id, ...(queryParams ?? {}) },
        };

      default:
        return null;
    }
  }

  createURL(route: DeepLinkRoute): string {
    const { screen, params } = route;

    switch (screen) {
      case 'CourseDetail':
        return Linking.createURL(`course/${params?.courseId}`);

      case 'LessonDetail':
        return Linking.createURL(`lesson/${params?.lessonId}`);

      case 'DiscussionDetail':
        return Linking.createURL(`discussion/${params?.discussionId}`);

      case 'AITutor':
        return Linking.createURL(`ai-tutor/${params?.sessionId}`);

      case 'Profile':
        return Linking.createURL('profile');

      default:
        return Linking.createURL('/');
    }
  }

  async openURL(url: string): Promise<boolean> {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  }
}

export const deepLinkingService = new DeepLinkingService();

export function useDeepLinking() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Handle initial URL
    deepLinkingService.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URL changes while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  function handleDeepLink(url: string) {
    const route = deepLinkingService.parseURL(url);

    if (route) {
      navigation.navigate(route.screen, route.params);
    }
  }
}
