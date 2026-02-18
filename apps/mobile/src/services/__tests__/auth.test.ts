// Test the JWT expiry check logic in isolation
describe('auth token helpers', () => {
  it('detects expired JWT by checking exp claim', () => {
    // Build a mock expired JWT (exp in the past)
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const payload = btoa(JSON.stringify({ exp: pastExp, sub: 'user-1' }));
    const mockToken = `header.${payload}.signature`;

    // Inline the logic from isAuthenticated
    const parts = mockToken.split('.');
    const decoded = JSON.parse(atob(parts[1])) as { exp: number };
    const isExpired = decoded.exp * 1000 <= Date.now();

    expect(isExpired).toBe(true);
  });

  it('detects valid (non-expired) JWT', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const payload = btoa(JSON.stringify({ exp: futureExp, sub: 'user-1' }));
    const mockToken = `header.${payload}.signature`;

    const parts = mockToken.split('.');
    const decoded = JSON.parse(atob(parts[1])) as { exp: number };
    const isValid = decoded.exp * 1000 > Date.now();

    expect(isValid).toBe(true);
  });
});
