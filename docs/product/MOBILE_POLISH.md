# Mobile App Polish (Phase 15)

Complete native features for production-ready mobile experience.

## Features Added

### ✅ Push Notifications (expo-notifications)

### ✅ Biometric Authentication (expo-local-authentication)

### ✅ Camera Integration (expo-camera, expo-image-picker)

### ✅ Offline Course Downloads (expo-file-system)

### ✅ Background Sync (expo-background-fetch, expo-task-manager)

### ✅ Deep Linking (expo-linking)

## 1. Push Notifications

**File:** [apps/mobile/src/services/notifications.ts](../apps/mobile/src/services/notifications.ts)

### Features

- Local and remote push notifications
- Permission handling
- Notification channels (Android)
- Badge count management
- Sound and vibration
- Notification listeners

### Usage

```typescript
import { notificationService } from './services/notifications';

// Initialize and get token
const token = await notificationService.initialize();
console.log('Push token:', token);

// Setup listeners
notificationService.setupListeners(
  // On notification received
  (notification) => {
    console.log('Received:', notification);
  },
  // On notification tapped
  (response) => {
    console.log('Tapped:', response);
    // Navigate to relevant screen
  }
);

// Schedule local notification
await notificationService.scheduleLocal(
  'Quiz Reminder',
  'Complete your daily quiz!',
  { quizId: '123' },
  3600 // 1 hour
);

// Badge management
await notificationService.setBadgeCount(5);
const count = await notificationService.getBadgeCount();
```

### Server Integration

Send notifications from backend:

```typescript
// Send to Expo Push Notification service
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: pushToken,
    title: 'New Message',
    body: 'You have a new message from your tutor',
    data: { messageId: '123' },
    sound: 'default',
    badge: 1,
  }),
});
```

## 2. Biometric Authentication

**File:** [apps/mobile/src/services/biometrics.ts](../apps/mobile/src/services/biometrics.ts)

### Features

- Fingerprint recognition
- Face ID / Face recognition
- Iris scanning
- Secure credential storage
- Fallback to device PIN/password

### Usage

```typescript
import { biometricService } from './services/biometrics';

// Check capabilities
const capabilities = await biometricService.getCapabilities();
console.log('Available:', capabilities.isAvailable);
console.log('Types:', capabilities.types); // ['fingerprint', 'facial']

// Authenticate user
const authenticated = await biometricService.authenticate(
  'Authenticate to view grades'
);

if (authenticated) {
  // Access sensitive data
}

// Enable biometric login
const enabled = await biometricService.enableBiometricLogin(
  'user-123',
  'auth-token-abc'
);

// Login with biometrics
const credentials = await biometricService.biometricLogin();
if (credentials) {
  console.log('Logged in as:', credentials.userId);
  // Use credentials.token for API calls
}

// Save/retrieve secure data
await biometricService.saveCredential('apiKey', 'secret-key');
const apiKey = await biometricService.getCredential('apiKey');
```

### UI Integration

```typescript
function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function handleBiometricLogin() {
    setLoading(true);
    const result = await biometricService.biometricLogin();

    if (result) {
      // Login successful
      navigation.navigate('Home');
    } else {
      Alert.alert('Authentication failed');
    }
    setLoading(false);
  }

  return (
    <Button
      title="Login with Biometrics"
      onPress={handleBiometricLogin}
      loading={loading}
    />
  );
}
```

## 3. Camera Integration

**File:** [apps/mobile/src/services/camera.ts](../apps/mobile/src/services/camera.ts)

### Features

- Take photos
- Record videos
- Pick from gallery
- Multiple selection
- Image editing
- Permission handling

### Usage

```typescript
import { cameraService } from './services/camera';

// Request permissions
const granted = await cameraService.requestPermissions();

// Take photo
const photo = await cameraService.takePicture({
  allowsEditing: true,
  aspect: [16, 9],
  quality: 0.8,
});

if (photo) {
  console.log('Photo URI:', photo.uri);
  console.log('Size:', photo.width, 'x', photo.height);
  // Upload photo.uri to server
}

// Pick from gallery
const image = await cameraService.pickFromGallery({
  mediaTypes: 'images',
  quality: 0.9,
});

// Pick multiple
const images = await cameraService.pickMultiple({
  quality: 0.7,
});

console.log(`Selected ${images.length} images`);
```

### Upload to Server

```typescript
async function uploadImage(uri: string) {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as any);

  const response = await fetch('https://api.edusphere.com/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return await response.json();
}
```

## 4. Offline Course Downloads

**File:** [apps/mobile/src/services/downloads.ts](../apps/mobile/src/services/downloads.ts)

### Features

- Download entire courses
- Progress tracking
- Pause/resume downloads
- Storage management
- Offline playback

### Usage

```typescript
import { downloadService } from './services/downloads';

// Download course
await downloadService.downloadCourse('course-123', courseData, (progress) => {
  console.log(`${progress.percentage.toFixed(1)}%`);
  setDownloadProgress(progress.percentage);
});

// Get offline courses
const courses = await downloadService.getOfflineCourses();
console.log(`${courses.length} courses available offline`);

// Get storage usage
const totalSize = await downloadService.getTotalDownloadSize();
console.log(`Using ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

// Delete course
await downloadService.deleteCourse('course-123');

// Pause/resume
await downloadService.pauseDownload('course-123', 'lesson-456');
await downloadService.resumeDownload('course-123', 'lesson-456');
```

### UI Component

```typescript
function CourseDownloadButton({ course }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadService.downloadCourse(
        course.id,
        course,
        (p) => setProgress(p.percentage)
      );
      Alert.alert('Success', 'Course downloaded');
    } catch (error) {
      Alert.alert('Error', 'Download failed');
    }
    setDownloading(false);
  }

  return downloading ? (
    <View>
      <Text>{progress.toFixed(0)}%</Text>
      <ProgressBar progress={progress / 100} />
    </View>
  ) : (
    <Button title="Download" onPress={handleDownload} />
  );
}
```

## 5. Background Sync

**File:** [apps/mobile/src/services/backgroundSync.ts](../apps/mobile/src/services/backgroundSync.ts)

### Features

- Sync offline mutations when app is closed
- Runs every 15 minutes
- Battery-efficient
- Automatic retry on failure

### Usage

```typescript
import { backgroundSyncService } from './services/backgroundSync';
import { apolloClient } from './apollo';

// Configure Apollo client
backgroundSyncService.configureApolloClient(apolloClient);

// Register background task
await backgroundSyncService.registerBackgroundSync();

// Check status
const status = await backgroundSyncService.getStatus();
console.log('Background fetch status:', status);

// Manual sync
await backgroundSyncService.performSync();

// Unregister (e.g., on logout)
await backgroundSyncService.unregisterBackgroundSync();
```

### App.tsx Integration

```typescript
useEffect(() => {
  // Setup background sync on app start
  backgroundSyncService.configureApolloClient(apolloClient);
  backgroundSyncService.registerBackgroundSync();

  return () => {
    // Cleanup on unmount
    backgroundSyncService.unregisterBackgroundSync();
  };
}, []);
```

## 6. Deep Linking

**File:** [apps/mobile/src/services/deepLinking.ts](../apps/mobile/src/services/deepLinking.ts)

### Features

- Universal links (iOS)
- App links (Android)
- Custom URL scheme
- Route parsing
- Navigation integration

### URL Scheme

```
edusphere://course/123
edusphere://lesson/456
edusphere://discussion/789
edusphere://ai-tutor/session-123
edusphere://profile
```

### Usage

```typescript
import { deepLinkingService, useDeepLinking } from './services/deepLinking';

// In App.tsx or root component
function App() {
  useDeepLinking(); // Automatically handles deep links

  return <Navigation />;
}

// Parse URL
const route = deepLinkingService.parseURL('edusphere://course/123');
console.log(route); // { screen: 'CourseDetail', params: { courseId: '123' } }

// Create URL
const url = deepLinkingService.createURL({
  screen: 'CourseDetail',
  params: { courseId: '123' },
});
console.log(url); // edusphere://course/123

// Share URL
import * as Sharing from 'expo-sharing';

const url = deepLinkingService.createURL({
  screen: 'CourseDetail',
  params: { courseId: '123' },
});

await Sharing.shareAsync(url, {
  message: 'Check out this course!',
});
```

### app.json Configuration

```json
{
  "expo": {
    "scheme": "edusphere",
    "ios": {
      "associatedDomains": ["applinks:edusphere.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "edusphere.com"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## Database Schema Updates

Add to [database.ts](../apps/mobile/src/services/database.ts):

```sql
CREATE TABLE IF NOT EXISTS offline_courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  downloaded_at INTEGER NOT NULL,
  size INTEGER NOT NULL,
  lessons_count INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_downloaded_at ON offline_courses(downloaded_at);
```

## Production Checklist

### Push Notifications

- [ ] Register for push certificate (iOS)
- [ ] Configure FCM (Android)
- [ ] Test foreground notifications
- [ ] Test background notifications
- [ ] Test notification tapping
- [ ] Implement notification settings

### Biometrics

- [ ] Test on real devices
- [ ] Handle permission denials gracefully
- [ ] Implement fallback authentication
- [ ] Test credential storage security
- [ ] Document supported devices

### Camera

- [ ] Request camera permissions properly
- [ ] Handle permission denials
- [ ] Test image compression
- [ ] Implement upload retry logic
- [ ] Test on low-storage devices

### Downloads

- [ ] Implement download queue
- [ ] Handle network interruptions
- [ ] Monitor storage usage
- [ ] Implement cleanup strategy
- [ ] Test pause/resume functionality

### Background Sync

- [ ] Test on iOS background refresh
- [ ] Test on Android Doze mode
- [ ] Monitor battery impact
- [ ] Implement exponential backoff
- [ ] Log sync results

### Deep Linking

- [ ] Configure universal links
- [ ] Test deep link routing
- [ ] Handle invalid URLs
- [ ] Test share functionality
- [ ] Document URL scheme

## Statistics

**Files Created:** 6 service files
**Features Added:** 6 major features
**Dependencies Added:** 9 Expo modules
**Total Lines:** ~1,200 lines of production code

## Next Steps

### Production Release

1. Configure EAS Build
2. Submit to App Store / Play Store
3. Setup analytics (Firebase, Amplitude)
4. Configure crash reporting (Sentry)
5. Implement A/B testing
6. Add in-app purchases (optional)

---

**Version:** 1.0.0
**Last Updated:** February 2026
