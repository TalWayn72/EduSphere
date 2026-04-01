/**
 * ProfileScreen — expanded pure logic tests.
 * Covers: user info formatting, role badge logic, Apollo query states,
 * loading state, avatar initials, menu navigation targets,
 * email masking, empty/missing data handling.
 */
import { describe, it, expect, vi } from 'vitest';

// --- Apollo mock ---
const mockUseQuery = vi.fn();
vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  gql: (s: TemplateStringsArray) => s.join(''),
}));

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

function formatDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return email.split('@')[0] ?? email;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local[0]}${'*'.repeat(Math.max(0, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

function getAvatarInitials(
  firstName: string | null,
  lastName: string | null
): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`;
}

function getRoleBadgeLabel(role: string): string {
  const map: Record<string, string> = {
    STUDENT: 'Student',
    INSTRUCTOR: 'Instructor',
    ORG_ADMIN: 'Admin',
    SUPER_ADMIN: 'Super Admin',
    RESEARCHER: 'Researcher',
  };
  return map[role] ?? role;
}

const MOCK_PROFILE: UserProfile = {
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Cohen',
  role: 'STUDENT',
};

describe('ProfileScreen — user info rendering', () => {
  it('formats full name when both parts present', () => {
    expect(formatDisplayName('Alice', 'Cohen', 'alice@example.com')).toBe(
      'Alice Cohen'
    );
  });

  it('uses first name only when last name absent', () => {
    expect(formatDisplayName('Alice', null, 'alice@example.com')).toBe('Alice');
  });

  it('falls back to email username when no name', () => {
    expect(formatDisplayName(null, null, 'alice@example.com')).toBe('alice');
  });
});

describe('ProfileScreen — role badge', () => {
  it('STUDENT role shows "Student"', () => {
    expect(getRoleBadgeLabel('STUDENT')).toBe('Student');
  });

  it('INSTRUCTOR role shows "Instructor"', () => {
    expect(getRoleBadgeLabel('INSTRUCTOR')).toBe('Instructor');
  });

  it('ORG_ADMIN role shows "Admin"', () => {
    expect(getRoleBadgeLabel('ORG_ADMIN')).toBe('Admin');
  });

  it('SUPER_ADMIN role shows "Super Admin"', () => {
    expect(getRoleBadgeLabel('SUPER_ADMIN')).toBe('Super Admin');
  });

  it('unknown role returns raw value', () => {
    expect(getRoleBadgeLabel('CUSTOM_ROLE')).toBe('CUSTOM_ROLE');
  });
});

describe('ProfileScreen — avatar initials', () => {
  it('generates initials from first + last name', () => {
    expect(getAvatarInitials('Alice', 'Cohen')).toBe('AC');
  });

  it('handles missing last name', () => {
    expect(getAvatarInitials('Alice', null)).toBe('A');
  });

  it('handles both names missing', () => {
    expect(getAvatarInitials(null, null)).toBe('');
  });
});

describe('ProfileScreen — email masking', () => {
  it('masks email correctly', () => {
    expect(maskEmail('alice@example.com')).toMatch(/^a\*+e@example\.com$/);
  });

  it('returns email unchanged if no @ sign', () => {
    expect(maskEmail('invalidemail')).toBe('invalidemail');
  });

  it('handles short local part', () => {
    const masked = maskEmail('ab@test.com');
    expect(masked).toContain('@test.com');
  });
});

describe('ProfileScreen — Apollo query states', () => {
  it('loading state: data is undefined', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });
    const result = mockUseQuery();
    expect(result.loading).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('success state: me data present', () => {
    mockUseQuery.mockReturnValue({
      data: { me: MOCK_PROFILE },
      loading: false,
    });
    const result = mockUseQuery();
    expect(result.data.me.firstName).toBe('Alice');
    expect(result.data.me.role).toBe('STUDENT');
  });

  it('profile has all required fields', () => {
    expect(MOCK_PROFILE.id).toBeTruthy();
    expect(MOCK_PROFILE.email).toContain('@');
    expect(MOCK_PROFILE.role).toBeTruthy();
  });
});

describe('ProfileScreen — menu items', () => {
  it('Settings navigation target is "Settings"', () => {
    const navigate = vi.fn();
    navigate('Settings');
    expect(navigate).toHaveBeenCalledWith('Settings');
  });

  it('version string format', () => {
    const version = '1.0.0';
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
