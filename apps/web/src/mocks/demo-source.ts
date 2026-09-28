import type { Span } from '@ps154/shared';

export const DEMO_SOURCE = `Incident Note — Sector VPN Gateway Compromise

Between 3 and 9 September, sector monitoring recorded a campaign targeting VPN gateways across 37 organisations. The traffic pattern was consistent across targets, arriving from a narrow band of source addresses rather than the broad, noisy scanning typically associated with opportunistic credential-stuffing tools.

Three of the affected organisations confirmed that attackers used firmware-level flaws present in SSL-VPN gateways running versions released before June 2026. These gateways had not yet received the vendor's June security update at the time of compromise.

Analysts recommend applying the vendor's September security patch immediately across all exposed gateways, and reviewing authentication logs for the affected date range.

No further indicators have been confirmed beyond the network activity described above.`;

const idx = (needle: string) => DEMO_SOURCE.indexOf(needle);
const span = (id: string, text: string, page = 1): Span => {
  const start = idx(text);
  return { span_id: id, text, start_offset: start, end_offset: start + text.length, page };
};

export const DEMO_SPANS: Span[] = [
  span('span_1', 'sector monitoring recorded a campaign targeting VPN gateways across 37 organisations'),
  span('span_2', 'The traffic pattern was consistent across targets, arriving from a narrow band of source addresses'),
  span('span_3', 'attackers used firmware-level flaws present in SSL-VPN gateways running versions released before June 2026'),
  span('span_4', "Analysts recommend applying the vendor's September security patch immediately"),
];
