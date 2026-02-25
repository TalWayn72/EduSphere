import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'crypto';
import { BigBlueButtonClient, createBbbClient, BBB_DEMO_JOIN_URL } from './bbb.client';

const TEST_URL = 'https://bbb.example.com/bigbluebutton/api';
const TEST_SECRET = 'test-secret-abc123';

function expectedChecksum(apiCall: string, params: Record<string, string>): string {
  const queryString = new URLSearchParams(params).toString();
  return createHash('sha256')
    .update(apiCall + queryString + TEST_SECRET)
    .digest('hex');
}

describe('BigBlueButtonClient', () => {
  let client: BigBlueButtonClient;

  beforeEach(() => {
    client = new BigBlueButtonClient(TEST_URL, TEST_SECRET);
  });

  describe('buildJoinUrl', () => {
    it('includes correct checksum in join URL', () => {
      const params = { meetingID: 'meeting-1', fullName: 'Alice', password: 'pw123', redirect: 'true' };
      const checksum = expectedChecksum('join', params);
      const url = client.buildJoinUrl('meeting-1', 'Alice', 'pw123');

      expect(url).toContain(`checksum=${checksum}`);
      expect(url).toContain('meetingID=meeting-1');
      expect(url).toContain('fullName=Alice');
    });

    it('URL-encodes the fullName', () => {
      const url = client.buildJoinUrl('meeting-1', 'Dr. Smith', 'pw');
      expect(url).toContain('fullName=Dr.+Smith');
    });

    it('starts with the configured BBB URL', () => {
      const url = client.buildJoinUrl('m1', 'User', 'pw');
      expect(url.startsWith(`${TEST_URL}/join`)).toBe(true);
    });
  });

  describe('createMeeting', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('resolves when BBB returns SUCCESS', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        text: async () => '<returncode>SUCCESS</returncode>',
      }));

      await expect(
        client.createMeeting('mid', 'Meeting', 'apw', 'mpw'),
      ).resolves.toBeUndefined();
    });

    it('throws when BBB returns FAILED', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        text: async () => '<returncode>FAILED</returncode><message>Bad meeting</message>',
      }));

      await expect(
        client.createMeeting('mid', 'Meeting', 'apw', 'mpw'),
      ).rejects.toThrow('BBB create meeting failed');
    });
  });

  describe('getRecordingUrl', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('extracts the recording URL from XML', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        text: async () =>
          '<returncode>SUCCESS</returncode><url>https://bbb.example.com/rec/meeting-1</url>',
      }));

      const url = await client.getRecordingUrl('meeting-1');
      expect(url).toBe('https://bbb.example.com/rec/meeting-1');
    });

    it('returns null when no recording is available', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        text: async () => '<returncode>SUCCESS</returncode><recordings/>',
      }));

      const url = await client.getRecordingUrl('meeting-1');
      expect(url).toBeNull();
    });
  });

  describe('createBbbClient', () => {
    afterEach(() => {
      delete process.env.BBB_URL;
      delete process.env.BBB_SECRET;
    });

    it('returns null when BBB_URL is not set', () => {
      delete process.env.BBB_URL;
      expect(createBbbClient()).toBeNull();
    });

    it('returns a client when both vars are set', () => {
      process.env.BBB_URL = TEST_URL;
      process.env.BBB_SECRET = TEST_SECRET;
      const c = createBbbClient();
      expect(c).toBeInstanceOf(BigBlueButtonClient);
    });
  });

  describe('BBB_DEMO_JOIN_URL', () => {
    it('is a valid HTTPS URL', () => {
      expect(BBB_DEMO_JOIN_URL).toMatch(/^https:\/\//);
    });
  });
});
