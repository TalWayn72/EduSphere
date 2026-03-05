import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type {
  ThemePrimitives,
  UserThemePreferences,
  ThemeMode,
  FontSize,
  MotionPreference,
} from '@/lib/theme';
import {
  applyTenantTheme,
  applyUserPreferences,
  previewTheme,
} from '@/lib/theme';

interface ThemeContextValue {
  // Current state
  tenantPrimitives: ThemePrimitives;
  userPreferences: UserThemePreferences;
  resolvedMode: 'light' | 'dark';

  // Actions
  setTenantTheme: (primitives: ThemePrimitives) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  setReadingMode: (enabled: boolean) => void;
  setMotionPreference: (pref: MotionPreference) => void;
  previewThemeChanges: (primitives: ThemePrimitives) => () => void;
}

const DEFAULT_PREFERENCES: UserThemePreferences = {
  mode: 'system',
  fontSize: 'md',
  readingMode: false,
  motionPreference: 'full',
  contrastMode: 'normal',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tenantPrimitives, setTenantPrimitives] = useState<ThemePrimitives>(
    {}
  );
  const [userPreferences, setUserPreferences] =
    useState<UserThemePreferences>(() => {
      try {
        const stored = localStorage.getItem('edusphere-user-prefs');
        return stored
          ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
          : DEFAULT_PREFERENCES;
      } catch {
        return DEFAULT_PREFERENCES;
      }
    });

  const resolvedMode =
    userPreferences.mode === 'system'
      ? typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : userPreferences.mode;

  useEffect(() => {
    applyUserPreferences(userPreferences);
    try {
      localStorage.setItem(
        'edusphere-user-prefs',
        JSON.stringify(userPreferences)
      );
    } catch {
      /* ignore */
    }
  }, [userPreferences]);

  useEffect(() => {
    if (Object.keys(tenantPrimitives).length > 0) {
      applyTenantTheme(tenantPrimitives);
    }
  }, [tenantPrimitives]);

  // Listen for system color scheme changes
  useEffect(() => {
    if (userPreferences.mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyUserPreferences(userPreferences);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [userPreferences]);

  const setTenantTheme = useCallback((primitives: ThemePrimitives) => {
    setTenantPrimitives(primitives);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setUserPreferences((prev) => ({ ...prev, mode }));
  }, []);

  const setFontSize = useCallback((fontSize: FontSize) => {
    setUserPreferences((prev) => ({ ...prev, fontSize }));
  }, []);

  const setReadingMode = useCallback((readingMode: boolean) => {
    setUserPreferences((prev) => ({ ...prev, readingMode }));
  }, []);

  const setMotionPreference = useCallback((motionPreference: MotionPreference) => {
    setUserPreferences((prev) => ({ ...prev, motionPreference }));
  }, []);

  const previewThemeChanges = useCallback(
    (primitives: ThemePrimitives) => {
      return previewTheme(primitives);
    },
    []
  );

  return (
    <ThemeContext.Provider
      value={{
        tenantPrimitives,
        userPreferences,
        resolvedMode,
        setTenantTheme,
        setThemeMode,
        setFontSize,
        setReadingMode,
        setMotionPreference,
        previewThemeChanges,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
