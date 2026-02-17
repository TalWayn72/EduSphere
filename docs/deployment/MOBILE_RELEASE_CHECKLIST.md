# Mobile Release Checklist

This comprehensive checklist guides you through the mobile app release process for both iOS and Android platforms.

---

## 1. Pre-Release

### Version Bump
- [ ] Update version number in `app.json` or `app.config.js`
  - [ ] Increment `version` (e.g., 1.2.3)
  - [ ] Increment `ios.buildNumber`
  - [ ] Increment `android.versionCode`
- [ ] Update version in `package.json` if applicable
- [ ] Ensure version follows semantic versioning (MAJOR.MINOR.PATCH)
- [ ] Update version in any marketing materials or documentation

### Changelog
- [ ] Update CHANGELOG.md with all changes since last release
  - [ ] New features
  - [ ] Bug fixes
  - [ ] Breaking changes
  - [ ] Performance improvements
  - [ ] Security updates
- [ ] Review changelog for clarity and completeness
- [ ] Prepare release notes for App Store and Play Store (localized if needed)
- [ ] Keep release notes under character limits (4000 chars for iOS, 500 chars for Play Store)

### Testing
- [ ] Run full test suite
  - [ ] Unit tests: `npm test` or `yarn test`
  - [ ] Integration tests
  - [ ] E2E tests: `detox test` or equivalent
- [ ] Manual testing on physical devices
  - [ ] iOS: Test on multiple iPhone models (latest and older versions)
  - [ ] Android: Test on multiple device manufacturers (Samsung, Google, etc.)
- [ ] Test on different OS versions
  - [ ] iOS: Minimum supported version to latest
  - [ ] Android: Minimum API level to latest
- [ ] Test in different network conditions (WiFi, 4G, 3G, offline)
- [ ] Verify all deep links and universal links work
- [ ] Test push notifications
- [ ] Verify in-app purchases (if applicable)
- [ ] Test app permissions flow
- [ ] Accessibility testing (VoiceOver, TalkBack)
- [ ] Performance testing (app startup time, memory usage)
- [ ] Security testing (API authentication, data encryption)

---

## 2. iOS App Store

### Certificates & Provisioning Profiles
- [ ] Verify Apple Developer Program membership is active
- [ ] Check distribution certificate validity (expires annually)
  - [ ] Location: Apple Developer Portal > Certificates, Identifiers & Profiles
  - [ ] Renew if expiring within 30 days
- [ ] Verify provisioning profile is up to date
  - [ ] App Store Distribution profile
  - [ ] Push Notifications profile (if using)
- [ ] Ensure certificates are installed in Keychain Access
- [ ] Update Xcode with latest provisioning profiles
- [ ] Verify app identifier (Bundle ID) matches

### Build Configuration
- [ ] Set build configuration to Release
- [ ] Verify code signing settings in Xcode
  - [ ] Team: Select correct team
  - [ ] Signing Certificate: Distribution
  - [ ] Provisioning Profile: App Store
- [ ] Disable debugging features
- [ ] Remove test/debug code and console logs
- [ ] Verify app icons for all required sizes
  - [ ] 1024x1024 (App Store)
  - [ ] Various sizes for devices
- [ ] Check launch screen/splash screen
- [ ] Verify app name and display name

### Build & Upload
- [ ] Build app using EAS Build or Xcode
  - [ ] `eas build --platform ios --profile production`
  - [ ] Or: Archive in Xcode (Product > Archive)
- [ ] Validate build before uploading
  - [ ] Xcode > Window > Organizer > Validate App
- [ ] Upload to App Store Connect
  - [ ] Via Xcode Organizer
  - [ ] Or: `xcrun altool --upload-app`
  - [ ] Or: Transporter app
- [ ] Wait for processing to complete (10-30 minutes)

### Screenshots & Media
- [ ] Prepare screenshots for all required device sizes
  - [ ] 6.7" (iPhone 14 Pro Max, 15 Pro Max)
  - [ ] 6.5" (iPhone 11 Pro Max, XS Max)
  - [ ] 5.5" (iPhone 8 Plus)
  - [ ] iPad Pro (12.9", 3rd gen)
  - [ ] iPad Pro (12.9", 2nd gen)
- [ ] Create app previews (videos) if desired (optional but recommended)
- [ ] Prepare localized screenshots for supported languages
- [ ] Ensure screenshots follow App Store guidelines
  - [ ] No sensitive or inappropriate content
  - [ ] Accurate representation of app

### App Store Connect
- [ ] Log in to App Store Connect
- [ ] Navigate to "My Apps" > Select your app
- [ ] Create new version
  - [ ] Enter version number
  - [ ] Add "What's New" text (release notes)
- [ ] Upload screenshots and media
- [ ] Fill in app metadata (if first release)
  - [ ] App name
  - [ ] Subtitle
  - [ ] Description
  - [ ] Keywords
  - [ ] Support URL
  - [ ] Marketing URL
  - [ ] Privacy Policy URL
- [ ] Select build from processed builds
- [ ] Set pricing and availability
- [ ] Configure age rating
- [ ] Review app information for accuracy
- [ ] Submit for review
- [ ] Respond to any App Review questions promptly

---

## 3. Google Play

### Signing Keys
- [ ] Verify upload keystore exists and is backed up securely
  - [ ] Location: `android/app/upload-keystore.jks` or similar
  - [ ] Store keystore password in secure location (password manager)
- [ ] If using Play App Signing (recommended):
  - [ ] Verify app is enrolled in Play App Signing
  - [ ] Google manages app signing key
  - [ ] You upload with upload key
- [ ] Verify keystore credentials in `gradle.properties` or environment variables
- [ ] Check key validity (25+ years from creation)

### Build Configuration
- [ ] Set build variant to `release`
- [ ] Verify signing configuration in `android/app/build.gradle`
  ```gradle
  signingConfigs {
      release {
          storeFile file(UPLOAD_STORE_FILE)
          storePassword UPLOAD_STORE_PASSWORD
          keyAlias UPLOAD_KEY_ALIAS
          keyPassword UPLOAD_KEY_PASSWORD
      }
  }
  ```
- [ ] Enable ProGuard/R8 for code obfuscation
- [ ] Disable debugging and logging
- [ ] Remove unused resources
- [ ] Verify app icons for all densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- [ ] Check adaptive icon support (Android 8.0+)
- [ ] Verify app name in `strings.xml`

### Build Android App Bundle (AAB)
- [ ] Build AAB using EAS Build or Gradle
  - [ ] `eas build --platform android --profile production`
  - [ ] Or: `cd android && ./gradlew bundleRelease`
- [ ] Verify AAB is signed
  - [ ] `jarsigner -verify -verbose android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Test AAB locally using bundletool
  - [ ] Generate APKs from bundle
  - [ ] Install on test device
- [ ] Check bundle size (under 150MB recommended)

### Play Console Upload
- [ ] Log in to Google Play Console
- [ ] Navigate to your app
- [ ] Go to "Production" or "Open Testing" track
- [ ] Create new release
- [ ] Upload AAB file
- [ ] Wait for upload and processing
- [ ] Review any warnings or errors from Play Console

### Screenshots & Media
- [ ] Prepare screenshots for required device types
  - [ ] Phone: 16:9 and 9:16 aspect ratios (min 320px)
  - [ ] 7-inch tablet (optional)
  - [ ] 10-inch tablet (optional)
- [ ] Feature graphic: 1024 x 500 pixels (required)
- [ ] App icon: 512 x 512 pixels, 32-bit PNG (required)
- [ ] Promo video (YouTube link, optional)
- [ ] Prepare localized screenshots for supported languages
- [ ] Ensure all media follows Play Store guidelines

### Play Console Configuration
- [ ] Fill in release details
  - [ ] Release name (e.g., "v1.2.3")
  - [ ] Release notes (what's new) - max 500 characters
  - [ ] Localized release notes if applicable
- [ ] Update store listing (if needed)
  - [ ] App name
  - [ ] Short description (80 chars)
  - [ ] Full description (4000 chars)
  - [ ] Screenshots and graphics
  - [ ] Categorization
  - [ ] Contact details
  - [ ] Privacy policy URL
- [ ] Set content rating
- [ ] Configure pricing and distribution
  - [ ] Countries
  - [ ] Price (free or paid)
- [ ] Review all pre-launch reports
- [ ] Submit for review

---

## 4. App Review Guidelines

### iOS Human Interface Guidelines
- [ ] Follow iOS design patterns and conventions
  - [ ] Navigation bars, tab bars, toolbars
  - [ ] System fonts and typography
  - [ ] Standard UI components
- [ ] Respect system-wide appearance settings
  - [ ] Dark Mode support
  - [ ] Dynamic Type support
- [ ] Avoid mimicking system UI unnecessarily
- [ ] Use SF Symbols where appropriate
- [ ] Follow safe area and layout margins
- [ ] Implement proper keyboard handling
- [ ] Support all device orientations (or justify portrait-only)
- [ ] Ensure touch targets are minimum 44x44 points
- [ ] Provide clear and meaningful error messages

### iOS App Store Review Guidelines
- [ ] App is complete and functional
- [ ] No crashes, bugs, or broken features
- [ ] Metadata is accurate and complete
- [ ] App doesn't request unnecessary permissions
- [ ] Privacy policy is accessible
- [ ] App doesn't use private APIs
- [ ] No placeholder content or "coming soon" features
- [ ] In-app purchases are properly implemented (if applicable)
- [ ] App follows content guidelines (no offensive material)
- [ ] Complies with legal requirements (COPPA, GDPR, etc.)

### Android Material Design
- [ ] Follow Material Design 3 guidelines
  - [ ] Material You dynamic theming
  - [ ] Proper use of Material components
  - [ ] Elevation and shadows
  - [ ] Motion and transitions
- [ ] Use Material Design icons and iconography
- [ ] Implement proper navigation patterns
  - [ ] Bottom navigation
  - [ ] Navigation drawer
  - [ ] Back button behavior
- [ ] Support Android system settings
  - [ ] Dark theme
  - [ ] Font size scaling
- [ ] Follow Android platform conventions
  - [ ] Status bar and navigation bar theming
  - [ ] Notification design
  - [ ] Widget design (if applicable)

### Android Play Store Policies
- [ ] App meets quality standards
  - [ ] Crashes on less than 2% of sessions
  - [ ] ANRs on less than 0.5% of sessions
- [ ] Target latest Android API level
  - [ ] Google requires targeting API level within one year of latest
- [ ] No malicious behavior or harmful content
- [ ] Proper data handling and security
- [ ] Accurate app description and metadata
- [ ] No deceptive or manipulative behavior
- [ ] Compliance with restricted content policies
- [ ] Proper ads implementation (if using)
- [ ] Complies with Families Policy (if targeting children)

---

## 5. Privacy Policy & Permissions

### Privacy Policy
- [ ] Privacy policy is up to date
- [ ] Privacy policy URL is accessible and working
- [ ] Privacy policy covers all data collection
  - [ ] Personal information collected
  - [ ] How data is used
  - [ ] Third-party services and SDKs
  - [ ] Data sharing practices
  - [ ] User rights (access, deletion, portability)
  - [ ] Data retention policies
  - [ ] Security measures
- [ ] Privacy policy linked in app (Settings screen recommended)
- [ ] Privacy policy complies with regulations
  - [ ] GDPR (Europe)
  - [ ] CCPA (California)
  - [ ] COPPA (children's apps)

### iOS Permissions
- [ ] Review all requested permissions
- [ ] Provide clear usage descriptions in Info.plist
  - [ ] `NSCameraUsageDescription`
  - [ ] `NSPhotoLibraryUsageDescription`
  - [ ] `NSLocationWhenInUseUsageDescription`
  - [ ] `NSLocationAlwaysAndWhenInUseUsageDescription`
  - [ ] `NSMicrophoneUsageDescription`
  - [ ] `NSContactsUsageDescription`
  - [ ] `NSCalendarsUsageDescription`
  - [ ] `NSBluetoothAlwaysUsageDescription`
  - [ ] Others as needed
- [ ] Request permissions only when needed (not at launch)
- [ ] Provide context before requesting permission
- [ ] App functions gracefully if permission denied

### Android Permissions
- [ ] Review all requested permissions in AndroidManifest.xml
- [ ] Declare dangerous permissions appropriately
  - [ ] Camera
  - [ ] Location (fine/coarse)
  - [ ] Storage
  - [ ] Contacts
  - [ ] Microphone
  - [ ] Phone
  - [ ] Sensors
  - [ ] SMS
- [ ] Use runtime permissions for dangerous permissions (API 23+)
- [ ] Provide rationale for permission requests
- [ ] App functions gracefully if permission denied
- [ ] Remove unused permissions from manifest

### App Privacy Details (iOS App Store)
- [ ] Fill out App Privacy questionnaire in App Store Connect
  - [ ] Data types collected
  - [ ] Data used to track users
  - [ ] Data linked to users
  - [ ] Data not linked to users
- [ ] Ensure accuracy (Apple may verify)
- [ ] Update when data practices change

### Data Safety Section (Google Play)
- [ ] Complete Data Safety form in Play Console
  - [ ] Data collected and shared
  - [ ] Purpose of data collection
  - [ ] Security practices
  - [ ] Whether data is encrypted in transit
  - [ ] Whether users can request data deletion
- [ ] Ensure accuracy and completeness
- [ ] Update when data practices change

---

## 6. Beta Testing

### TestFlight (iOS)
- [ ] Upload beta build to App Store Connect
- [ ] Create internal testing group
  - [ ] Add internal testers (email addresses)
  - [ ] Internal testers can install immediately
- [ ] Create external testing group (optional)
  - [ ] Add external testers
  - [ ] External testing requires Beta App Review (1-2 days)
  - [ ] Max 10,000 external testers
- [ ] Provide test information
  - [ ] What to test
  - [ ] Known issues
  - [ ] Feedback collection method
- [ ] Send invitations to testers
- [ ] Monitor crash reports and feedback
- [ ] Iterate based on feedback
- [ ] TestFlight builds expire after 90 days

### Google Play Internal Testing
- [ ] Create internal testing track in Play Console
- [ ] Upload AAB to internal testing track
- [ ] Add internal testers (email addresses or Google Groups)
  - [ ] Max 100 internal testers
- [ ] Share testing link with testers
- [ ] Testers can install immediately (no review)

### Google Play Closed Testing
- [ ] Create closed testing track (Alpha or Beta)
- [ ] Upload AAB to closed testing track
- [ ] Add testers
  - [ ] Email list
  - [ ] Google Group
  - [ ] Public link (anyone with link can join)
- [ ] Configure countries for testing
- [ ] Release to closed track
- [ ] Collect feedback through in-app feedback or external channels
- [ ] Monitor pre-launch reports

### Google Play Open Testing
- [ ] Create open testing track
- [ ] Upload AAB to open testing track
- [ ] Anyone can join (public)
- [ ] Max 10,000 testers
- [ ] Use for public beta programs
- [ ] Release to open track

### Testing Best Practices
- [ ] Define clear testing goals
- [ ] Provide test scenarios and test cases
- [ ] Create feedback collection mechanism
  - [ ] In-app feedback form
  - [ ] Email
  - [ ] Crash reporting tool
- [ ] Monitor analytics and crash reports
- [ ] Iterate quickly on feedback
- [ ] Test for at least 1-2 weeks before production
- [ ] Verify all major features work correctly

---

## 7. Production Release

### Final Pre-Release Checks
- [ ] All beta testing complete
- [ ] Critical bugs fixed
- [ ] All testing passed
- [ ] Stakeholder approval obtained
- [ ] Marketing materials ready
- [ ] Support team briefed on new features
- [ ] Documentation updated
- [ ] Backend services ready to handle load

### iOS Production Release
- [ ] Log in to App Store Connect
- [ ] Navigate to your app version
- [ ] Verify all metadata and screenshots
- [ ] Ensure build is selected
- [ ] Submit for review (if not already)
- [ ] Wait for Apple review (typically 1-3 days)
- [ ] Respond to any review feedback promptly
- [ ] Once approved, release options:
  - [ ] **Automatic release**: App goes live immediately
  - [ ] **Manual release**: You control release timing
  - [ ] **Scheduled release**: Set specific date/time
- [ ] Monitor release status

### Android Production Release
- [ ] Log in to Google Play Console
- [ ] Navigate to Production track
- [ ] Create new release
- [ ] Upload production AAB
- [ ] Add release notes
- [ ] Configure rollout percentage

### Phased Rollout Strategy
- [ ] **iOS**: Use phased release option
  - [ ] App Store Connect > App > Pricing and Availability
  - [ ] Enable "Phased Release for Automatic Updates"
  - [ ] Rollout over 7 days: Day 1 (1%), Day 2 (2%), Day 3 (5%), Day 4 (10%), Day 5 (20%), Day 6 (50%), Day 7 (100%)
  - [ ] Only applies to automatic updates

- [ ] **Android**: Set staged rollout percentage
  - [ ] Start with 5-10% of users
  - [ ] Monitor for 24-48 hours
  - [ ] Check crash rates and ANRs
  - [ ] Review user feedback and ratings
  - [ ] If stable, increase to 25%
  - [ ] Monitor for 24 hours
  - [ ] Increase to 50%
  - [ ] Monitor for 24 hours
  - [ ] Increase to 100%

- [ ] **Rollout Pause**: Pause rollout if issues detected
  - [ ] High crash rate
  - [ ] Critical bugs reported
  - [ ] Negative user feedback spike
  - [ ] Backend issues

### Release Communication
- [ ] Announce release to users
  - [ ] Email newsletter
  - [ ] Social media
  - [ ] In-app announcement
  - [ ] Blog post
- [ ] Update website with new version info
- [ ] Notify support team
- [ ] Update documentation and help center

---

## 8. Post-Release Monitoring

### Sentry Configuration
- [ ] Verify Sentry is configured in production build
- [ ] Check Sentry DSN is correct
- [ ] Configure release tracking
  - [ ] Set release version in Sentry
  - [ ] Upload source maps (for better stack traces)
- [ ] Set up alerts for new issues
  - [ ] Critical errors
  - [ ] High-volume errors
  - [ ] Performance degradation
- [ ] Monitor Sentry dashboard for first 24-48 hours

### Firebase Analytics
- [ ] Verify Firebase Analytics is enabled
- [ ] Confirm events are being tracked
  - [ ] Screen views
  - [ ] User actions
  - [ ] Custom events
- [ ] Monitor user engagement metrics
  - [ ] Daily/Monthly Active Users
  - [ ] Session duration
  - [ ] Retention rates
  - [ ] Conversion funnels
- [ ] Check for anomalies or unexpected behavior
- [ ] Review user properties and demographics

### Crash Reports
- [ ] Monitor crash-free user rate
  - [ ] Target: >99% crash-free users
- [ ] Check crash trends in Firebase Crashlytics
- [ ] Review crash reports in App Store Connect
  - [ ] Navigate to Analytics > Metrics > Crashes
- [ ] Review crash reports in Google Play Console
  - [ ] Navigate to Quality > Android vitals > Crashes & ANRs
- [ ] Prioritize and fix critical crashes
- [ ] Track top crashes by volume

### Performance Monitoring
- [ ] Monitor app performance metrics
  - [ ] App startup time
  - [ ] Screen rendering time
  - [ ] Network request latency
  - [ ] API response times
- [ ] Use Firebase Performance Monitoring
- [ ] Check for performance regressions
- [ ] Monitor battery usage and memory consumption
- [ ] Review ANR (Application Not Responding) rates on Android

### User Feedback & Ratings
- [ ] Monitor app store ratings and reviews
  - [ ] iOS: App Store Connect > Ratings and Reviews
  - [ ] Android: Play Console > User feedback > Reviews
- [ ] Respond to user reviews promptly
  - [ ] Thank positive reviews
  - [ ] Address concerns in negative reviews
  - [ ] Provide solutions or ask for more info
- [ ] Track rating trends over time
- [ ] Identify common complaints or feature requests
- [ ] Use feedback to prioritize bug fixes and features

### Backend Monitoring
- [ ] Monitor API server performance
  - [ ] Response times
  - [ ] Error rates
  - [ ] Server load
- [ ] Check database performance
- [ ] Review CDN and asset delivery
- [ ] Verify third-party integrations working
- [ ] Monitor authentication and authorization systems

### Key Metrics to Track
- [ ] Downloads/Installs (first 7 days)
- [ ] Crash-free user rate
- [ ] User retention (Day 1, Day 7, Day 30)
- [ ] Session duration
- [ ] Active users (DAU, WAU, MAU)
- [ ] App rating and review sentiment
- [ ] API error rates
- [ ] Feature adoption rates
- [ ] Conversion rates (if applicable)

---

## 9. Hotfix Process

### When to Issue a Hotfix
- [ ] Critical crash affecting >5% of users
- [ ] Security vulnerability discovered
- [ ] Data loss or corruption bug
- [ ] Feature completely broken
- [ ] Legal or compliance issue
- [ ] Severe performance degradation

### EAS OTA (Over-The-Air) Updates
- [ ] Verify issue can be fixed with OTA update
  - [ ] JavaScript/TypeScript code changes only
  - [ ] Asset changes (images, fonts)
  - [ ] Cannot change native code or dependencies
- [ ] Create hotfix branch from release tag
  - [ ] `git checkout -b hotfix/v1.2.4 v1.2.3`
- [ ] Implement fix and test thoroughly
- [ ] Commit fix with clear message
- [ ] Build OTA update
  - [ ] `eas update --branch production --message "Hotfix: Fix critical login bug"`
- [ ] Publish OTA update
  - [ ] Update pushed to users on next app launch
  - [ ] No app store review required
- [ ] Monitor rollout and user impact
- [ ] Verify fix resolves issue

### Full Binary Release (Native Changes)
- [ ] If OTA update is not possible (native code changes)
- [ ] Create hotfix branch
- [ ] Implement and test fix
- [ ] Bump patch version (e.g., 1.2.3 -> 1.2.4)
- [ ] Follow expedited review process
  - [ ] iOS: Request expedited review in App Store Connect
    - [ ] Explain critical nature of fix
    - [ ] Apple may approve in 24-48 hours
  - [ ] Android: Release with 100% rollout
    - [ ] No review delay
    - [ ] Can go live immediately
- [ ] Submit hotfix build
- [ ] Communicate hotfix to users if needed

### Hotfix Workflow
1. [ ] Identify and verify issue
2. [ ] Assess severity and impact
3. [ ] Determine fix strategy (OTA vs binary)
4. [ ] Create hotfix branch
5. [ ] Implement fix
6. [ ] Test fix thoroughly
7. [ ] Build and deploy
8. [ ] Monitor rollout
9. [ ] Merge hotfix back to main/develop branch
10. [ ] Create post-mortem document

---

## 10. Rollback Procedure

### When to Rollback
- [ ] Critical crash rate >5%
- [ ] Data loss or corruption
- [ ] Security vulnerability introduced
- [ ] Major feature broken
- [ ] Severe performance regression
- [ ] User rating drops significantly

### iOS Rollback
- [ ] **Note**: Apple does not support direct rollback
- [ ] Cannot revert users to previous version automatically
- [ ] Options:
  - [ ] **Hotfix approach**: Release urgent fix as new version
  - [ ] **Remove from sale**: Temporarily remove app (prevents new downloads)
  - [ ] **Version availability**: Users who haven't updated won't receive update
- [ ] Request expedited review for hotfix
- [ ] Communicate issue to users in release notes

### Android Rollback
- [ ] Log in to Google Play Console
- [ ] Navigate to Production track
- [ ] Click on "Releases" tab
- [ ] Find previous stable release
- [ ] Options:
  - [ ] **Halt rollout**: Stop current release from reaching more users
    - [ ] Click "Halt rollout" on active release
    - [ ] Prevents new users from receiving update
    - [ ] Users who already updated remain on new version
  - [ ] **Re-release previous version**: Not officially supported
    - [ ] Cannot decrease version code
    - [ ] Must release hotfix with higher version code
  - [ ] **Staged rollout reduction**: Reduce percentage
    - [ ] Lower rollout percentage to contain issue
    - [ ] Fix issue and increase percentage again

### OTA Rollback (EAS Update)
- [ ] Publish rollback update to previous JavaScript bundle
- [ ] Identify last known good update/commit
- [ ] Create rollback update
  - [ ] `eas update --branch production --message "Rollback to v1.2.3"`
  - [ ] Point to previous commit/bundle
- [ ] Publish rollback update
- [ ] Monitor to ensure issue is resolved
- [ ] Users receive rollback on next app launch

### Rollback Communication
- [ ] Notify stakeholders immediately
  - [ ] Engineering team
  - [ ] Product managers
  - [ ] Support team
  - [ ] Marketing team
- [ ] Update status page (if applicable)
- [ ] Prepare user communication
  - [ ] In-app message
  - [ ] Email notification
  - [ ] Social media update
- [ ] Be transparent about issue and resolution
- [ ] Provide timeline for fix

### Post-Rollback Actions
- [ ] Conduct incident post-mortem
  - [ ] What went wrong?
  - [ ] Why wasn't it caught in testing?
  - [ ] How can we prevent this in future?
- [ ] Document lessons learned
- [ ] Update testing procedures
- [ ] Improve CI/CD safeguards
- [ ] Fix root cause
- [ ] Add regression tests
- [ ] Plan next release with fix

---

## Release Sign-Off

Before final release, ensure all stakeholders approve:

- [ ] Engineering Lead
- [ ] QA/Testing Team
- [ ] Product Manager
- [ ] Design Team (if UI changes)
- [ ] Marketing Team (if marketing campaign)
- [ ] Legal/Compliance (if privacy/legal changes)
- [ ] Support Team (briefed and ready)

---

## Notes

- Keep this checklist updated as processes evolve
- Customize for your specific app requirements
- Document any deviations or special cases
- Maintain release history and metrics
- Regular releases build user trust and engagement

**Last Updated**: 2026-02-17
