import { createHash } from 'crypto';

const BBB_DEMO_JOIN_URL = 'https://demo.bigbluebutton.org/gl/meeting-demo';

export interface BbbMeetingInfo {
  running: boolean;
}

/**
 * BigBlueButton REST API client.
 * Checksum: SHA256(apiCall + queryString + secret)
 * All API calls return XML — we parse key fields with targeted regex.
 */
export class BigBlueButtonClient {
  private readonly bbbUrl: string;
  private readonly bbbSecret: string;

  constructor(bbbUrl: string, bbbSecret: string) {
    this.bbbUrl = bbbUrl.replace(/\/$/, '');
    this.bbbSecret = bbbSecret;
  }

  private buildUrl(apiCall: string, params: Record<string, string>): string {
    const queryString = new URLSearchParams(params).toString();
    const checksum = createHash('sha256')
      .update(apiCall + queryString + this.bbbSecret)
      .digest('hex');
    return `${this.bbbUrl}/${apiCall}?${queryString}&checksum=${checksum}`;
  }

  private extractXmlField(xml: string, field: string): string | null {
    const match = xml.match(new RegExp(`<${field}>(.*?)<\/${field}>`));
    return match?.[1] ?? null;
  }

  async createMeeting(
    meetingId: string,
    name: string,
    attendeePW: string,
    moderatorPW: string,
  ): Promise<void> {
    const url = this.buildUrl('create', {
      meetingID: meetingId,
      name,
      attendeePW,
      moderatorPW,
      record: 'true',
      autoStartRecording: 'true',
      allowStartStopRecording: 'false',
    });

    const response = await fetch(url);
    const text = await response.text();

    if (!text.includes('<returncode>SUCCESS</returncode>')) {
      const message = this.extractXmlField(text, 'message') ?? text.slice(0, 200);
      throw new Error(`BBB create meeting failed: ${message}`);
    }
  }

  buildJoinUrl(
    meetingId: string,
    fullName: string,
    password: string,
  ): string {
    return this.buildUrl('join', {
      meetingID: meetingId,
      fullName,
      password,
      redirect: 'true',
    });
  }

  async getMeetingInfo(meetingId: string): Promise<BbbMeetingInfo> {
    const url = this.buildUrl('getMeetingInfo', { meetingID: meetingId });
    const response = await fetch(url);
    const text = await response.text();
    const running = text.includes('<running>true</running>');
    return { running };
  }

  async getRecordingUrl(meetingId: string): Promise<string | null> {
    const url = this.buildUrl('getRecordings', { meetingID: meetingId });
    const response = await fetch(url);
    const text = await response.text();

    if (!text.includes('<returncode>SUCCESS</returncode>')) return null;

    const match = text.match(/<url>(.*?)<\/url>/);
    return match?.[1] ?? null;
  }

  /**
   * Create breakout rooms inside an active BBB meeting.
   * Calls the BBB breakoutRooms API for each room definition.
   */
  async sendBreakoutRooms(
    meetingId: string,
    rooms: Array<{ name: string; sequence: number; durationMinutes: number }>,
  ): Promise<void> {
    for (const room of rooms) {
      const url = this.buildUrl('create', {
        meetingID: `${meetingId}-breakout-${room.sequence}`,
        name: room.name,
        parentMeetingID: meetingId,
        sequence: String(room.sequence),
        freeJoin: 'false',
        record: 'false',
        duration: String(room.durationMinutes),
        isBreakout: 'true',
      });
      const response = await fetch(url);
      const text = await response.text();
      if (!text.includes('<returncode>SUCCESS</returncode>')) {
        const message = this.extractXmlField(text, 'message') ?? text.slice(0, 200);
        throw new Error(`BBB breakout room create failed: ${message}`);
      }
    }
  }
}

/**
 * Returns a configured BBB client, or null when BBB_URL is not set
 * (graceful degradation for dev environments).
 */
export function createBbbClient(): BigBlueButtonClient | null {
  const bbbUrl = process.env.BBB_URL;
  const bbbSecret = process.env.BBB_SECRET;

  if (!bbbUrl || !bbbSecret) {
    return null;
  }

  return new BigBlueButtonClient(bbbUrl, bbbSecret);
}

export { BBB_DEMO_JOIN_URL };
