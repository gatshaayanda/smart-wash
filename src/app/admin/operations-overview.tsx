"use client";

import type { VulaBooking, VulaFleetRequest, VulaQueueEntry, VulaService } from "@/lib/firebase/big-brothers-data";

type AdminTab = "bookings" | "queue" | "fleet" | "services" | "settings" | "gallery" | "loyalty" | "games" | "reviews" | "inbox" | "retention";
type Inquiry = { id: string; customerName: string; phone: string; subject: string; message: string; status: string; createdAt: string; reply?: string; repliedAt?: string };
type EngagementMetrics = { publicViews7d: number; trackedAccounts: number; accountOpens7d: number; bookingRequests: number; walkInEntries: number; followUpDue: number };
type Props = {
  bookings: VulaBooking[];
  queue: VulaQueueEntry[];
  fleet: VulaFleetRequest[];
  services: VulaService[];
  inquiries: Inquiry[];
  inboxLoading: boolean;
  engagementMetrics: EngagementMetrics | null;
  onOpenTab: (tab: AdminTab) => void;
};
type RecentItem = { id: string; kind: string; name: string; detail: string; status: string; at: string; tab: AdminTab };

function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (name: string) => parts.find(item => item.type === name)?.value || "";
  return part("year") + "-" + part("month") + "-" + part("day");
}
function when(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time not recorded";
  return new Intl.DateTimeFormat("en-BW", { timeZone: "Africa/Gaborone", dateStyle: "medium", timeStyle: "short" }).format(date);
}
function label(value: string) { return value.replace(/[-_]/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()); }

export default function OperationsOverview({ bookings, queue, fleet, services, inquiries, inboxLoading, engagementMetrics, onOpenTab }: Props) {
  const today = dateKey(new Date());
  const todayBookings = bookings.filter(item => dateKey(item.scheduledFor) === today);
  const awaiting = bookings.filter(item => item.status === "requested");
  const confirmed = bookings.filter(item => item.status === "confirmed").length;
  const inProgress = bookings.filter(item => item.status === "in-progress").length;
  const waiting = queue.filter(item => item.status === "waiting");
  const inService = queue.filter(item => item.status === "in-service");
  const newFleet = fleet.filter(item => item.status === "new");
  const pendingReplies = inquiries.filter(item => item.status.toLowerCase() !== "replied");
  const activeServices = services.filter(item => item.active);
  const hiddenServices = services.filter(item => !item.active);
  const unpriced = activeServices.filter(item => typeof item.price !== "number");
  const needsAttention = awaiting.length + waiting.length + newFleet.length + pendingReplies.length;
  const recent: RecentItem[] = [
    ...bookings.map(item => ({ id: item.id, kind: "Booking", name: item.customerName || "Customer", detail: item.serviceName, status: item.status, at: item.createdAt, tab: "bookings" as AdminTab })),
    ...queue.map(item => ({ id: item.id, kind: "Walk-in", name: item.customerName || "Customer", detail: item.serviceName, status: item.status, at: item.createdAt, tab: "queue" as AdminTab })),
    ...fleet.map(item => ({ id: item.id, kind: "Fleet", name: item.businessName || item.contactName || "Business customer", detail: item.vehicleCount + " vehicles", status: item.status, at: item.createdAt, tab: "fleet" as AdminTab })),
  ].filter(item => Number.isFinite(Date.parse(item.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 5);

  return (
    <section className="sw-ops-overview" aria-label="Smart Wash operations overview">
      <div className="sw-ops-heading">
        <div><p className="big-brothers-eyebrow">TODAY · GABORONE TIME</p><h2>Today's operation</h2></div>
        <span className="sw-ops-date">{new Intl.DateTimeFormat("en-BW", { timeZone: "Africa/Gaborone", weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span>
      </div>
      <div className="sw-ops-kpis">
        <button type="button" className="sw-ops-kpi" onClick={() => onOpenTab("bookings")}><span>Today's bookings</span><strong>{todayBookings.length}</strong><small>{awaiting.length} awaiting confirmation</small></button>
        <button type="button" className="sw-ops-kpi" onClick={() => onOpenTab("queue")}><span>Wash floor</span><strong>{waiting.length + inService.length}</strong><small>{waiting.length} waiting · {inService.length} in service</small></button>
        <button type="button" className="sw-ops-kpi" onClick={() => onOpenTab("fleet")}><span>Fleet enquiries</span><strong>{newFleet.length}</strong><small>New business requests</small></button>
        <button type="button" className="sw-ops-kpi" onClick={() => onOpenTab("inbox")}><span>Customer messages</span><strong>{inboxLoading ? "…" : pendingReplies.length}</strong><small>Awaiting a reply</small></button>
      </div>
      <div className="sw-ops-grid">
        <section className="sw-ops-panel">
          <div className="sw-ops-panel-heading"><div><p className="big-brothers-eyebrow">NEXT UP</p><h3>Needs attention</h3></div><span className="sw-ops-count">{needsAttention} open</span></div>
          <div className="sw-ops-action-list">
            <button type="button" className="sw-ops-action" onClick={() => onOpenTab("bookings")}><span className="sw-ops-action-number">{awaiting.length}</span><span className="sw-ops-action-copy"><strong>Confirm booking requests</strong><small>Check time, service and capacity</small></span><span className="sw-ops-arrow">›</span></button>
            <button type="button" className="sw-ops-action" onClick={() => onOpenTab("queue")}><span className="sw-ops-action-number">{waiting.length + inService.length}</span><span className="sw-ops-action-copy"><strong>Move the wash queue</strong><small>{waiting.length} waiting · {inService.length} being washed</small></span><span className="sw-ops-arrow">›</span></button>
            <button type="button" className="sw-ops-action" onClick={() => onOpenTab("fleet")}><span className="sw-ops-action-number">{newFleet.length}</span><span className="sw-ops-action-copy"><strong>Reply to fleet leads</strong><small>Vehicle count, needs and schedule</small></span><span className="sw-ops-arrow">›</span></button>
            <button type="button" className="sw-ops-action" onClick={() => onOpenTab("inbox")}><span className="sw-ops-action-number">{inboxLoading ? "…" : pendingReplies.length}</span><span className="sw-ops-action-copy"><strong>Answer customer messages</strong><small>Save replies to the customer's account</small></span><span className="sw-ops-arrow">›</span></button>
            {needsAttention === 0 && !inboxLoading && <p className="sw-ops-clear">No outstanding actions in the records currently loaded.</p>}
          </div>
        </section>
        <section className="sw-ops-panel">
          <div className="sw-ops-panel-heading"><div><p className="big-brothers-eyebrow">SERVICE PULSE</p><h3>At a glance</h3></div></div>
          <div className="sw-ops-pulse-list">
            <div><span>Confirmed bookings</span><strong>{confirmed}</strong></div>
            <div><span>Bookings in progress</span><strong>{inProgress}</strong></div>
            <div><span>Published services</span><strong>{activeServices.length}</strong></div>
            <div><span>Hidden services</span><strong>{hiddenServices.length}</strong></div>
            <div><span>Published services without a price</span><strong>{unpriced.length}</strong></div>
          </div>
          <p className="sw-ops-footnote">Only completed receipts count as recorded transactions. Requests and proposed prices are not revenue.</p>
          <button type="button" className="sw-ops-link" onClick={() => onOpenTab("services")}>Edit services & prices ↗</button>
        </section>
      </div>
      <div className="sw-ops-lower-grid">
        <section className="sw-ops-panel">
          <div className="sw-ops-panel-heading"><div><p className="big-brothers-eyebrow">CUSTOMER CARE</p><h3>Keep in touch</h3></div><button type="button" className="sw-ops-text-button" onClick={() => onOpenTab("retention")}>Follow-ups ↗</button></div>
          {engagementMetrics ? <div className="sw-ops-customer-stats"><div><strong>{engagementMetrics.accountOpens7d}</strong><span>Account opens · 7d</span></div><div><strong>{engagementMetrics.trackedAccounts}</strong><span>Tracked accounts</span></div><div><strong>{engagementMetrics.followUpDue}</strong><span>Consented follow-ups due</span></div></div> : <p className="sw-ops-muted">Follow-ups include only customers who opted in.</p>}
          <button type="button" className="sw-ops-link" onClick={() => onOpenTab("inbox")}>Open private inbox ↗</button>
        </section>
        <section className="sw-ops-panel">
          <div className="sw-ops-panel-heading"><div><p className="big-brothers-eyebrow">LATEST ACTIVITY</p><h3>Recent requests</h3></div></div>
          {recent.length ? <div className="sw-ops-recent-list">{recent.map(item => <article className="sw-ops-recent-row" key={item.kind + "-" + item.id}><div><span>{item.kind} · {label(item.status)}</span><strong>{item.name}</strong><small>{item.detail || "Details not supplied"} · {when(item.at)}</small></div><button type="button" onClick={() => onOpenTab(item.tab)}>Open</button></article>)}</div> : <p className="sw-ops-muted">New bookings, walk-ins and fleet requests appear here.</p>}
        </section>
      </div>
      <section className="sw-ops-quick-tools">
        <div><p className="big-brothers-eyebrow">WORKSPACE TOOLS</p><h3>Manage Smart Wash</h3></div>
        <div className="sw-ops-tool-links">
          <button type="button" onClick={() => onOpenTab("services")}>Services</button>
          <button type="button" onClick={() => onOpenTab("settings")}>Settings</button>
          <button type="button" onClick={() => onOpenTab("gallery")}>Gallery</button>
          <button type="button" onClick={() => onOpenTab("reviews")}>Reviews</button>
          <button type="button" onClick={() => onOpenTab("loyalty")}>Loyalty</button>
          <button type="button" onClick={() => onOpenTab("games")}>Racing</button>
        </div>
      </section>
    </section>
  );
}
