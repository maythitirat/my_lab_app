import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookEvent, MessageEvent, TextEventMessage } from '@line/bot-sdk';
import { LineService } from '../line/line.service';
import { ReportData } from '../line/flex/admin-report.flex';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly lineService: LineService,
    private readonly config: ConfigService,
  ) {}

  async handleEvents(events: WebhookEvent[]): Promise<void> {
    for (const event of events) {
      if (event.type === 'message') {
        await this.handleMessage(event as MessageEvent);
      }
    }
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    if (event.message.type !== 'text') return;

    const text = (event.message as TextEventMessage).text.trim();
    const source = event.source;

    // Determine sender's LINE user ID and push-back destination
    const senderUserId = source.type === 'user' ? source.userId
      : source.type === 'group' ? (source as any).userId
      : source.type === 'room' ? (source as any).userId
      : undefined;

    const replyTo = source.type === 'group' ? (source as any).groupId
      : source.type === 'room' ? (source as any).roomId
      : source.type === 'user' ? source.userId
      : undefined;

    const adminUserId = this.config.get<string>('LINE_ADMIN_USER_ID');

    // ── Auto-save every sender's userId to line_followers ──────────────────
    if (!senderUserId) return;
    if (senderUserId !== adminUserId) {
      // Save this user in the background — so admin can later link them to a customer
      this.handleRegisterFollower(event, senderUserId).catch(() => {});
      this.logger.log(`Ignored message from non-admin ${senderUserId}: "${text}"`);
      return;
    }

    this.logger.log(`Admin command: "${text}" from ${senderUserId}`);
    const lower = text.toLowerCase().trim();

    // ── Report command ───────────────────────────────────────────────────────
    // Exact keywords → current period
    if (lower === 'รายงาน' || lower === 'report' || lower === 'รายงานวันนี้') {
      await this.handleReportCommand(replyTo);
      return;
    }

    // "รายงาน <date>" or "report <date>"
    // Accepted date formats (label date = end-of-period calendar date, BKK):
    //   D/M          e.g.  6/4        → 2026-04-06  (current year assumed)
    //   D/M/YY       e.g.  6/4/26     → 2026-04-06
    //   D/M/YYYY     e.g.  6/4/2026   → 2026-04-06
    //   YYYY-MM-DD   e.g.  2026-04-06 → pass through
    const reportMatch = lower.match(/^(?:รายงาน|report)\s+(.+)$/);
    if (reportMatch) {
      const labelDate = this.parseLabelDate(reportMatch[1].trim());
      if (labelDate) {
        await this.handleReportCommand(replyTo, labelDate);
      } else {
        this.logger.warn(`Could not parse date from report command: "${text}"`);
        // Optionally push a hint message back — skip for now
      }
      return;
    }

    // ── Export CSV command ───────────────────────────────────────────────────
    // "ส่งออก" / "export" / "ส่งออก 6/4" / "export 2026-04-06"
    const exportMatch = lower.match(/^(?:ส่งออก|export)(?:\s+(.+))?$/);
    if (lower === 'ส่งออก' || lower === 'export' || exportMatch) {
      const dateArg = exportMatch?.[1]?.trim();
      const labelDate = dateArg ? this.parseLabelDate(dateArg) : undefined;
      await this.handleExportCommand(replyTo, labelDate ?? undefined);
      return;
    }

    // Future: parse other admin commands like "confirm 5", "cancel 5"
  }

  /**
   * Parse a user-supplied date string into "YYYY-MM-DD".
   * Supports: "D/M", "D/M/YY", "D/M/YYYY", "YYYY-MM-DD"
   * Returns null if the input cannot be parsed.
   */
  private parseLabelDate(raw: string): string | null {
    // ISO format pass-through: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    // D/M, D/M/YY, D/M/YYYY
    const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (slashMatch) {
      const d = parseInt(slashMatch[1], 10);
      const m = parseInt(slashMatch[2], 10);
      let y: number;
      if (!slashMatch[3]) {
        // No year supplied → use current BKK year
        y = new Date(Date.now() + 7 * 3600_000).getUTCFullYear();
      } else if (slashMatch[3].length <= 2) {
        y = 2000 + parseInt(slashMatch[3], 10);
      } else {
        y = parseInt(slashMatch[3], 10);
      }
      if (m < 1 || m > 12 || d < 1 || d > 31) return null;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    return null;
  }

  /**
   * Fetch the daily report from the backend and push it to the admin.
   * Supports optional date query: "รายงาน 2026-04-06"
   */
  private async handleReportCommand(replyTo: string | undefined, labelDate?: string): Promise<void> {
    if (!replyTo) {
      this.logger.warn('Cannot determine reply target for report command');
      return;
    }

    const backendUrl = this.config.get<string>('BACKEND_URL');
    if (!backendUrl) {
      this.logger.error('BACKEND_URL not configured');
      return;
    }

    const url = labelDate
      ? `${backendUrl}/orders/report?date=${labelDate}`
      : `${backendUrl}/orders/report`;

    let data: ReportData;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      data = await res.json();
    } catch (err: any) {
      this.logger.error(`Failed to fetch report: ${err.message}`);
      return;
    }

    await this.lineService.sendReportWithHint(replyTo, data);
  }

  /**
   * Send a download link for the CSV report to the admin.
   */
  private async handleExportCommand(replyTo: string | undefined, labelDate?: string): Promise<void> {
    if (!replyTo) return;

    const backendUrl = this.config.get<string>('BACKEND_URL');
    if (!backendUrl) {
      this.logger.error('BACKEND_URL not configured');
      return;
    }

    const csvUrl = labelDate
      ? `${backendUrl}/orders/report/csv?date=${labelDate}`
      : `${backendUrl}/orders/report/csv`;

    await this.lineService.sendExportLink(replyTo, csvUrl, labelDate);
  }

  /**
   * Called when a customer types "รับออเดอร์".
   * Fetches their profile and saves userId + displayName to backend.
   */
  private async handleRegisterFollower(event: MessageEvent, lineUserId: string): Promise<void> {
    const backendUrl = this.config.get<string>('BACKEND_URL');
    if (!backendUrl) return;

    // Fetch LINE profile for display name + picture
    const token = this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
    let displayName: string | null = null;
    let pictureUrl: string | null = null;
    try {
      const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const profile = await res.json() as { displayName: string; pictureUrl?: string };
        displayName = profile.displayName ?? null;
        pictureUrl = profile.pictureUrl ?? null;
      }
    } catch (err) {
      this.logger.warn(`Could not fetch profile for ${lineUserId}: ${err}`);
    }

    // Save to backend DB
    try {
      await fetch(`${backendUrl}/customers/followers/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, displayName, pictureUrl }),
      });
    } catch (err) {
      this.logger.error(`Failed to save follower ${lineUserId}: ${err}`);
    }

    this.logger.log(`Registered follower: ${lineUserId} (${displayName})`);
  }
}
