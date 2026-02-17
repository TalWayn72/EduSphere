# Mobile App Architecture (Phase 12)

Complete guide to the EduSphere mobile application built with Expo SDK 54.

## Overview

The mobile app provides a native iOS/Android experience with:
- ✅ 70-80% code sharing with web client
- ✅ Offline-first architecture with SQLite
- ✅ Real-time updates via WebSocket subscriptions
- ✅ Shared UI components package (@edusphere/ui)
- ✅ Automatic offline mutation queuing
- ✅ Network-aware sync system

## Architecture Layers

### 1. Presentation Layer (Screens)

All screens located in `apps/mobile/src/screens/`:

#### CoursesScreen.tsx
- Lists all available courses
- Uses FlatList for performance
- Pull-to-refresh support
- Offline cache with SQLite

```typescript
const { data, loading, refetch } = useQuery(COURSES_QUERY);

<FlatList
  data={data?.courses || []}
  renderItem={({ item }) => <CourseCard course={item} />}
  refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
/>
```

#### CourseDetailScreen.tsx
- Detailed course view with lessons
- Enrollment functionality
- Progress tracking
- Uses shared Card and Button components

#### DiscussionsScreen.tsx
- Real-time discussion feed
- Live updates via subscriptions
- Upvote/downvote functionality
- Optimistic UI updates

```typescript
useSubscription(DISCUSSION_SUB, {
  onData: ({ data }) => {
    setDiscussions(prev => [data.discussionCreated, ...prev]);
  }
});
```

#### AITutorScreen.tsx
- Streaming AI chat interface
- Real-time message delivery
- Message history with auto-scroll
- Typing indicators

#### ProfileScreen.tsx
- User profile management
- Settings and preferences
- Logout functionality

### 2. Data Layer (Apollo Client)

#### Apollo Client Setup ([App.tsx:47-51](../apps/mobile/App.tsx#L47-L51))

```typescript
const link = ApolloLink.from([
  offlineLink,      // Handles offline caching
  splitLink,        // Routes subscriptions to WebSocket
]);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
```

#### Offline Link ([apps/mobile/src/apollo/offlineLink.ts](../apps/mobile/src/apollo/offlineLink.ts))

Custom Apollo Link that:
1. Detects network status
2. Returns cached data when offline
3. Queues mutations for later sync
4. Caches successful query results

### 3. Storage Layer (SQLite)

#### Database Service ([apps/mobile/src/services/database.ts](../apps/mobile/src/services/database.ts))

Two main tables:

**cached_queries**
- Stores query results with variables
- Indexed by timestamp for efficient cleanup
- 7-day retention (configurable)

**offline_mutations**
- Queues mutations when offline
- Tracks sync status (pending/synced/failed)
- Ordered by timestamp

```sql
CREATE TABLE cached_queries (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  variables TEXT NOT NULL,
  data TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE TABLE offline_mutations (
  id TEXT PRIMARY KEY,
  mutation TEXT NOT NULL,
  variables TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  status TEXT NOT NULL
);
```

### 4. Offline Sync Hook

#### useOfflineSync ([apps/mobile/src/hooks/useOfflineSync.ts](../apps/mobile/src/hooks/useOfflineSync.ts))

Monitors network status and syncs pending mutations:

```typescript
const { isOnline, isSyncing, pendingCount, syncPendingMutations } = useOfflineSync();

// Automatically syncs when coming back online
// Shows sync status in UI
// Handles failed mutations gracefully
```

## Shared UI Components (@edusphere/ui)

Platform-agnostic components that work on both web and mobile.

### Button Component

```typescript
import { Button } from '@edusphere/ui';

<Button
  title="Enroll Now"
  variant="primary"   // primary | secondary | outline | ghost
  size="lg"           // sm | md | lg
  onPress={handleEnroll}
  loading={enrolling}
  fullWidth
/>
```

### Card Component

```typescript
import { Card } from '@edusphere/ui';

<Card variant="elevated" padding={20}>
  <Text variant="h3">Course Title</Text>
  <Text variant="body">Description...</Text>
</Card>
```

### Input Component

```typescript
import { Input } from '@edusphere/ui';

<Input
  label="Email Address"
  placeholder="you@example.com"
  value={email}
  onChangeText={setEmail}
  error={errors.email}
  helperText="We'll never share your email"
  autoCapitalize="none"
  keyboardType="email-address"
/>
```

### Text Component

```typescript
import { Text } from '@edusphere/ui';

<Text variant="h1">Heading 1</Text>
<Text variant="h2" color="#007AFF">Heading 2</Text>
<Text variant="body" align="center">Body text</Text>
<Text variant="caption" weight="bold">Caption</Text>
```

### Avatar Component

```typescript
import { Avatar } from '@edusphere/ui';

<Avatar name="John Doe" size={60} />
<Avatar uri="https://..." size={40} />
<Avatar
  name="Jane Smith"
  backgroundColor="#34C759"
  textColor="#fff"
  size={50}
/>
```

### Badge Component

```typescript
import { Badge } from '@edusphere/ui';

<Badge label="Published" variant="success" />
<Badge label="Draft" variant="warning" />
<Badge label="Error" variant="error" size="sm" />
```

## Navigation Structure

React Navigation 7 with Stack + Bottom Tabs:

```
MainStack (Stack Navigator)
├── MainTabs (Bottom Tab Navigator)
│   ├── Courses
│   ├── Discussions
│   ├── AI Tutor
│   └── Profile
└── CourseDetail (Modal Stack)
```

Configuration in [apps/mobile/src/navigation/index.tsx](../apps/mobile/src/navigation/index.tsx):

```typescript
<NavigationContainer>
  <Stack.Navigator>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
  </Stack.Navigator>
</NavigationContainer>
```

## Real-time Features

### Subscriptions Setup

WebSocket connection configured in [App.tsx:22-33](../apps/mobile/App.tsx#L22-L33):

```typescript
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: async () => ({
      authorization: await getAuthToken(),
    }),
  }),
);
```

### Live Discussions

```typescript
const DISCUSSION_SUB = gql`
  subscription OnDiscussionUpdate($courseId: ID!) {
    discussionCreated(courseId: $courseId) {
      id
      content
      author { firstName lastName }
      createdAt
    }
  }
`;

function DiscussionsScreen() {
  const { data } = useSubscription(DISCUSSION_SUB, {
    variables: { courseId }
  });

  useEffect(() => {
    if (data?.discussionCreated) {
      // Add to list with animation
      setDiscussions(prev => [data.discussionCreated, ...prev]);
    }
  }, [data]);
}
```

### Streaming AI Chat

```typescript
const MESSAGE_SUB = gql`
  subscription OnMessage($sessionId: ID!) {
    agentMessageCreated(sessionId: $sessionId) {
      id role content createdAt
    }
  }
`;

function AITutorScreen() {
  const { data } = useSubscription(MESSAGE_SUB);

  useEffect(() => {
    if (data?.agentMessageCreated) {
      setMessages(prev => [...prev, data.agentMessageCreated]);
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [data]);
}
```

## Offline-First Workflow

### Query Caching Flow

1. User makes GraphQL query
2. offlineLink checks network status
3. If online: Execute query → Cache result in SQLite
4. If offline: Return cached data from SQLite
5. Cache expires after 7 days

### Mutation Queuing Flow

1. User performs mutation (e.g., enroll in course)
2. offlineLink checks network status
3. If online: Execute mutation normally
4. If offline:
   - Add to offline_mutations table
   - Return optimistic response
   - Show "pending sync" indicator
5. When network restored:
   - useOfflineSync detects connection
   - Syncs all pending mutations
   - Updates UI with results
   - Marks as synced or failed

### Example: Offline Enrollment

```typescript
const [enrollInCourse] = useMutation(ENROLL_MUTATION);
const { isOnline, pendingCount } = useOfflineSync();

async function handleEnroll() {
  try {
    await enrollInCourse({ variables: { courseId } });

    if (!isOnline) {
      Alert.alert(
        'Queued for Sync',
        'Enrollment will complete when you\'re back online'
      );
    }
  } catch (error) {
    console.error('Enrollment failed:', error);
  }
}

// Show pending sync status
{pendingCount > 0 && (
  <Text>📤 {pendingCount} changes pending sync</Text>
)}
```

## Performance Optimizations

### List Rendering

Use FlatList with optimization props:

```typescript
<FlatList
  data={courses}
  renderItem={renderCourse}
  keyExtractor={item => item.id}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  getItemLayout={(data, index) => ({
    length: 120,
    offset: 120 * index,
    index,
  })}
/>
```

### Image Loading

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: course.thumbnail }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
/>
```

### Memoization

```typescript
const CourseCard = React.memo(({ course }) => (
  <Card>
    <Text>{course.title}</Text>
  </Card>
));
```

## Code Sharing Strategy

### Shared (70-80%)
- ✅ GraphQL queries and mutations
- ✅ Business logic and hooks
- ✅ UI components (@edusphere/ui)
- ✅ Type definitions
- ✅ Utilities and helpers

### Platform-Specific (20-30%)
- ❌ Navigation (React Navigation vs React Router)
- ❌ Native modules (Camera, Push Notifications)
- ❌ Platform APIs (SecureStore, FileSystem)
- ❌ Styling (some platform-specific styles)

### Example: Shared Hook

```typescript
// packages/hooks/src/useCourses.ts
export function useCourses() {
  const { data, loading, error } = useQuery(COURSES_QUERY);

  return {
    courses: data?.courses || [],
    loading,
    error,
  };
}

// Used in both web and mobile
import { useCourses } from '@edusphere/hooks';

function CoursesScreen() {
  const { courses, loading } = useCourses();
  // Platform-specific rendering
}
```

## Testing Strategy

### Unit Tests
```bash
# Test hooks and utilities
jest apps/mobile/src/hooks/__tests__
```

### Integration Tests
```bash
# Test screens with mocked Apollo
jest apps/mobile/src/screens/__tests__
```

### E2E Tests
```bash
# Detox for native e2e testing
detox test --configuration ios.sim.debug
```

## Build & Deployment

### Development Build
```bash
cd apps/mobile
expo start
```

### Production Build (EAS)
```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### Over-the-Air Updates
```bash
# Push updates without app store review
eas update --branch production --message "Bug fixes"
```

## Environment Variables

Create `.env` file:

```bash
EXPO_PUBLIC_API_URL=https://api.edusphere.com/graphql
EXPO_PUBLIC_WS_URL=wss://api.edusphere.com/graphql
EXPO_PUBLIC_SENTRY_DSN=https://...
```

Access via `expo-constants`:

```typescript
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl;
```

## Monitoring & Analytics

### Sentry Error Tracking
```typescript
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'https://...',
  enableInExpoDevelopment: true,
  debug: __DEV__,
});
```

### Analytics
```typescript
import * as Analytics from 'expo-firebase-analytics';

Analytics.logEvent('course_enrolled', {
  course_id: courseId,
  course_title: title,
});
```

## Next Steps

### Phase 13: Production Monitoring
- Add Prometheus metrics
- Setup Grafana dashboards
- Configure alerts

### Phase 14: AI/ML Pipeline
- Integrate RAG for semantic search
- Add LangGraph for complex workflows
- Build knowledge graph

### Mobile Enhancements
- Push notifications (expo-notifications)
- Biometric auth (expo-local-authentication)
- Camera integration (expo-camera)
- Download courses for offline viewing
- Background sync with expo-background-fetch
