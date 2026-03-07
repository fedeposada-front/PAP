export type LeadEventType =
  | "view_shop"
  | "click_call"
  | "click_route"
  | "click_message"
  | "reservation_request";

export interface LeadEvent {
  id: string;
  type: LeadEventType;
  at: string;
  sessionId: string;
  shopId?: string;
  productId?: string;
  metadata?: Record<string, string | number | boolean>;
}

interface TrackLeadEventInput {
  type: LeadEventType;
  shopId?: string;
  productId?: string;
  metadata?: Record<string, string | number | boolean>;
}

interface LeadStats {
  viewShop: number;
  clickCall: number;
  clickRoute: number;
  clickMessage: number;
  reservationRequest: number;
  totalLeads: number;
}

const LEAD_EVENTS_KEY = "mcl_lead_events_v1";
const SESSION_ID_KEY = "mcl_session_id_v1";

function getSessionId(): string {
  if (typeof window === "undefined") return "server";

  const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  return sessionId;
}

function readLeadEvents(): LeadEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LEAD_EVENTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as LeadEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeLeadEvents(events: LeadEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEAD_EVENTS_KEY, JSON.stringify(events));
}

export function trackLeadEvent(input: TrackLeadEventInput): LeadEvent {
  const event: LeadEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    at: new Date().toISOString(),
    sessionId: getSessionId(),
    shopId: input.shopId,
    productId: input.productId,
    metadata: input.metadata,
  };

  const events = readLeadEvents();
  events.push(event);
  writeLeadEvents(events);

  return event;
}

export function getLeadEvents(options?: { shopId?: string; sinceDays?: number }): LeadEvent[] {
  const events = readLeadEvents();

  const sinceDays = options?.sinceDays ?? 30;
  const sinceTs = Date.now() - sinceDays * 24 * 60 * 60 * 1000;

  return events.filter((event) => {
    if (options?.shopId && event.shopId !== options.shopId) return false;
    return new Date(event.at).getTime() >= sinceTs;
  });
}

export function getLeadStats(options?: { shopId?: string; sinceDays?: number }): LeadStats {
  const events = getLeadEvents(options);
  const stats: LeadStats = {
    viewShop: 0,
    clickCall: 0,
    clickRoute: 0,
    clickMessage: 0,
    reservationRequest: 0,
    totalLeads: 0,
  };

  for (const event of events) {
    if (event.type === "view_shop") stats.viewShop += 1;
    if (event.type === "click_call") stats.clickCall += 1;
    if (event.type === "click_route") stats.clickRoute += 1;
    if (event.type === "click_message") stats.clickMessage += 1;
    if (event.type === "reservation_request") stats.reservationRequest += 1;
  }

  stats.totalLeads =
    stats.clickCall + stats.clickRoute + stats.clickMessage + stats.reservationRequest;

  return stats;
}

