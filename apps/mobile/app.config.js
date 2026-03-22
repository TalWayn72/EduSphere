/**
 * app.config.js — Dynamic Expo configuration for white-label builds.
 *
 * When ORG_SLUG is set: uses custom bundle ID, app name, and icon.
 * When not set: uses default EduSphere branding.
 *
 * Environment variables:
 *   ORG_SLUG  — Organization slug (e.g., "acme-corp")
 *   ORG_NAME  — Display name (e.g., "Acme Learning")
 *   ORG_ICON  — Path to custom icon (e.g., "./assets/acme-icon.png")
 *   APP_VARIANT — Build variant ("org" for white-label)
 */

/** Sanitize a slug for use as a bundle ID segment. */
function slugToBundleSegment(slug) {
  return slug.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/** Build the dynamic Expo config. */
function buildAppConfig() {
  const orgSlug = process.env.ORG_SLUG;
  const orgName = process.env.ORG_NAME;
  const orgIcon = process.env.ORG_ICON;
  const appVariant = process.env.APP_VARIANT;

  const isOrgBuild = Boolean(orgSlug && appVariant === 'org');

  const bundleId = isOrgBuild
    ? `com.${slugToBundleSegment(orgSlug)}.learning`
    : 'com.edusphere.app';

  const appName = isOrgBuild && orgName ? orgName : 'EduSphere';
  const appIcon = isOrgBuild && orgIcon ? orgIcon : './assets/icon.png';

  return {
    expo: {
      name: appName,
      slug: isOrgBuild ? slugToBundleSegment(orgSlug) : 'edusphere',
      version: '1.0.0',
      orientation: 'portrait',
      icon: appIcon,
      userInterfaceStyle: 'automatic',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      assetBundlePatterns: ['**/*'],
      ios: {
        supportsTablet: true,
        bundleIdentifier: bundleId,
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
        package: bundleId,
        edgeToEdgeEnabled: true,
      },
      web: {
        favicon: './assets/favicon.png',
      },
      plugins: ['expo-sqlite'],
      extra: {
        eas: {
          projectId: 'your-project-id',
        },
        orgSlug: orgSlug || null,
        appVariant: appVariant || 'default',
      },
    },
  };
}

// Export for Expo CLI
module.exports = buildAppConfig();

// Also export helpers for testing
module.exports.slugToBundleSegment = slugToBundleSegment;
module.exports.buildAppConfig = buildAppConfig;
