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

function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Gaborone", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (name: string) => parts.find(item => item.type === name)?.value || "";
  return part("year") + "-" + part("month") + "-" + part("day");
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time not recorded";
  return new Intl.DateTimeFormat("en-BW", { timeZone: "Africa/Gaborone", dateStyle: "medium", timeStyle: "short" }).format(date);
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export default function OperationsOverview({
  bookings, queue, fleet, services, inquiries, inboxLoading, engagementMetrics, onOpenTab,
}: Props) {
  const today = localDateKey(new Date());
  const bookingsToday = bookings.filter(item => localDateKey(item.scheduledFor) === today).length;
  const requestedBookings = bookings.filter(item => item.status === "requested");
  const confirmedBookings = bookings.filter(item => item.status === "confirmed").length;
  const inProgressBookings = bookings.filter(item => item.status === "in-progress").length;
  const waitingQueue = queue.filter(item => item.status === "waiting");
  const inServiceQueue = queue.filter(item => item.status === "in-service");
  const newFleet = fleet.filter(item => item.status === "new");
  const pendingReplies = inquiries.filter(item => item.status.toLowerCase() !== "replied");
  const activeServices = services.filter(item => item.active);
  const hiddenServices = services.filter(item => !item.active);
  const unpricedServices = activeServices.filter(item => typeof item.price !== "number");

  const recent: RecentItem[] = [
    ...bookings.map(item => ({ id: item.id, kind: "Booking", name: item.customerName || "Customer", detail: item.serviceName, status: item.status, at: item.createdAt, tab: "bookings" as AdminTab })),
    ...queue.map(item => ({ id: item.id, kind: "Walk-in", name: item.customerName || "Customer", detail: item.serviceName, status: item.status, at: item.createdAt, tab: "queue" as AdminTab })),
    ...fleet.map(item => ({ id: item.id, kind: "Fleet enquiry", name: item.businessName || item.contactName || "Business customer", detail: item.vehicleCount + " vehicles", status: item.status, at: item.createdAt, tab: "fleet" as AdminTab })),
  ].filter(item => Number.isFinite(Date.parse(item.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 5);

  const needsAttention = requestedBookings.length + waitingQueue.length + newFleet.length + pendingReplies.length;

  return (
    <section className="sw-ops-overview" aria-label="Smart Wash operations overview">
      <div className="sw-ops-overview-heading">
        <div>
          <p className="big-brothers-eyebrow">TODAY · GABORONE TIME</p>
          <h2>Work that needs moving.</h2>
          <p>Live booking, walk-in and fleet activity. Start with the next action; open a work area for the full record.</p>
        </div>
        <span className="sw-ops-live"><span className="status-dot online" /> Live operations</span>
      </div>

      <div className="sw-ops-kpis">
        <article className="sw-ops-kpi"><span>Bookings scheduled today</span><strong>{bookingsToday}</strong><small>Based on the requested appointment time</small></article>
        <article className="sw-ops-kpi"><span>Awaiting confirmation</span><strong>{requestedBookings.length}</strong><small>Staff must confirm the actual slot</small></article>
        <article className="sw-ops-kpi"><span>Active wash queue</span><strong>{waitingQueue.length + inServiceQueue.length}</strong><small>{waitingQueue.length} waiting · {inServiceQueue.length} in service</small></article>
        <article className="sw-ops-kpi"><span>New fleet enquiries</span><strong>{newFleet.length}</strong><small>Business requests needing a response</small></article>
      </div>

      <div className="sw-ops-main-grid">
        <section className="sw-ops-panel">
          <div className="sw-ops-panel-heading">
            <div><p className="big-brothers-eyebrow">NEXT ACTION</p><h3>Work to do</h3></div>
            <span className="sw-ops-count">{needsAttention} open</span>
          </div>
          <div className="sw-ops-action-list">
            <button type="button" className="sw-ops-action" onClick={() => onOpenTab("bookings")}>
              <span className="sw-ops-action-number">{requestedBookings.length}</span>
              <span className="sw-ops-action-copy"><strong>Review booking requests</strong><small>Check the requested slot and confirm or contact the customer</small></span>
              <span className="sw-ops-arrow">›</span>
            </button>
            <button type="button" className="sw-ops-action" onClick={() => onOpenTab("queue")}>
              <span className="sw-ops-action-number">{waitingQueue.length + inServiceQueue.length}</span>
              <span className="sw-ops-action-copy"><strong>Run the wash queue</strong><small>{waitingQueue.length} waiting · {inServiceQueue.length} currently in service</small></span>
              <span className="sw-ops-arrow">›</span>
            </button>
            <button type="button" className="sw-ops-action" onClick={() => onOpenTab("fleet")}>
              <span className="sw-ops-action-number">{newFleet.length}</span>
              <span className="sw-ops-action-copy"><strong>Respond to fleet enquiries</strong><small>Review vehicle count, service needs and preferred schedule</small></span>
              <span className="sw-ops-arrow">›</span>
            </button>
            <button type="button" className="sw-ops-action" onClick={() => onOpenTab("inbox")}>
              <span className="sw-ops-action-number">{inboxLoading ? "…" : pendingReplies.length}</span>
              <span className="sw-ops-action-copy"><strong>Reply to customer messages</strong><small>{inboxLoading ? "Loading the private customer inbox" : "Replies are saved to the customer's account"}</small></span>
              <span className="sw-ops-arrow">›</span>
            </button>
            {needsAttention === 0 && !inboxLoading && <p className="sw-ops-clear">No pending booking, queue, fleet or inbox actions in the records currently loaded.</p>}
          </div>
        </section>

        <section className="sw-ops-panel">
          <div className="sw-ops-panel-heading"><div><p className="big-brothers-eyebrow">OPERATING PULSE</p><h3>At a glance</h3></div></div>
          <div className="sw-ops-pulse-list">
            <div><span>Confirmed bookings</span><strong>{confirmedBookings}</strong></div>
            <div><span>Bookings in progress</span><strong>{inProgressBookings}</strong></div>
            <div><span>Published services</span><strong>{activeServices.length}</strong></div>
            <div><span>Hidden services</span><strong>{hiddenServices.length}</strong></div>
            <div><span>Published services without a price</span><strong>{unpricedServices.length}</strong></div>
          </div>
          <p className="sw-ops-footnote">Payment and revenue totals are intentionally not inferred from booking requests or customer price proposals. Use the confirmed transaction and receipt records for actual charges.</p>
          <button type="button" className="sw-ops-link" onClick={() => onOpenTab("services")}>Manage service catalogue ↗</button>
        </section>
      </div>

      <div className="sw-ops-bottom-grid">
        <section className="sw-ops-panel">
          <div className="sw-ops-panel-heading"><div><p className="big-brothers-eyebrow">CUSTOMER RELATIONSHIPS</p><h3>Keep customers connected</h3></div><button type="button" className="sw-ops-text-button" onClick={() => onOpenTab("retention")}>Follow-ups ↗</button></div>
          {engagementMetrics ? (
            <div className="sw-ops-customer-stats">
              <div><strong>{engagementMetrics.accountOpens7d}</strong><span>Account opens · 7 days</span></div>
              <div><strong>{engagementMetrics.trackedAccounts}</strong><span>Tracked accounts</span></div>
              <div><strong>{engagementMetrics.followUpDue}</strong><span>Consented follow-ups due</span></div>
            </div>
          ) : (
            <p className="sw-ops-muted">Customer follow-up metrics load in the Follow-ups workspace. Only customers who opted in are eligible for WhatsApp follow-up.</p>
          )}
          <button type="button" className="sw-ops-link" onClick={() => onOpenTab("inbox")}>Open private customer inbox ↗</button>
        </section>

        <section className="sw-ops-panel">
          <div className="sw-ops-panel-heading"><div><p className="big-brothers-eyebrow">RECENT ACTIVITY</p><h3>Latest requests</h3></div></div>
          {recent.length ? (
            <div className="sw-ops-recent-list">
              {recent.map(item => (
                <article className="sw-ops-recent-row" key={item.kind + "-" + item.id}>
                  <div><span>{item.kind} · {titleCase(item.status)}</span><strong>{item.name}</strong><small>{item.detail || "Details not supplied"} · {formatWhen(item.at)}</small></div>
                  <button type="button" onClick={() => onOpenTab(item.tab)}>Open</button>
                </article>
              ))}
            </div>
          ) : <p className="sw-ops-muted">No booking, walk-in or fleet records have arrived yet.</p>}
        </section>
      </div>

      <section className="sw-ops-quick-tools">
        <div><p className="big-brothers-eyebrow">MANAGE SMART WASH</p><h3>Workspace shortcuts</h3></div>
        <div className="sw-ops-tool-links">
          <button type="button" onClick={() => onOpenTab("services")}>Services & prices</button>
          <button type="button" onClick={() => onOpenTab("settings")}>Business settings</button>
          <button type="button" onClick={() => onOpenTab("gallery")}>Gallery & submissions</button>
          <button type="button" onClick={() => onOpenTab("reviews")}>Review moderation</button>
          <button type="button" onClick={() => onOpenTab("loyalty")}>Loyalty balances</button>
          <button type="button" onClick={() => onOpenTab("games")}>Racing activity</button>
        </div>
      </section>
    </section>
  );
}
