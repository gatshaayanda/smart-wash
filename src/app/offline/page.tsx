/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";

export default function OfflinePage() {
  return <main className="vula">
    <div className="big-brothers-status"><span className="status-dot"/>Offline mode · Your app is still here</div>
    <section className="big-brothers-section">
      <p className="big-brothers-eyebrow">CONNECTION PAUSED</p>
      <h1 style={{fontSize:"clamp(40px,7vw,72px)"}}>Still here.<br/>Not yet synced.</h1>
      <p>Your connection dropped, but this app has a few useful things to try. What is available depends on what has already been cached on this device.</p>
      <div className="location-cards">
        <article>
          <span className="location-number">01</span>
          <h3>Prepare a wash request</h3>
          <p>Open the walk-in queue and complete the form. An offline request is saved on this device only; the team cannot see it until it syncs and the server confirms it.</p>
          <Link className="text-link" href="/#request">Open the walk-in queue ↗</Link>
        </article>
        <article>
          <span className="location-number">02</span>
          <h3>Take a racing break</h3>
          <p>Racing may still open if the game page and its assets have been cached from an earlier visit. Solo progress can be device-local.</p>
          <Link className="text-link" href="/games">Try Racing ↗</Link>
        </article>
        <article>
          <span className="location-number">03</span>
          <h3>Customer account</h3>
          <p>Your previously opened account can show customer details and records already saved on this device. New server receipts, messages and sign-in changes need a connection.</p>
          <Link className="text-link" href="/account">Open customer account ↗</Link>
        </article>
        <article>
          <span className="location-number">04</span>
          <h3>Staff operations</h3>
          <p>Staff can reopen the admin workspace previously loaded on this device and review Firestore data cached here. Firestore edits can queue locally and sync after reconnection; server-only actions such as issuing receipts, sending notifications and changing booking capacity need the network.</p>
          <Link className="text-link" href="/admin">Open staff operations ↗</Link>
        </article>
      </div>
      <p className="big-brothers-notice pending">Offline availability depends on a successful earlier visit on this device. The homepage, previously opened customer account and staff workspace, cached Firestore records, racing assets and the Smart Wash location film are prepared for offline use. Firestore-supported changes may wait in the device cache and sync when online. UploadThing media uploads, server API actions, receipts, notifications, live availability, weather and shared updates cannot complete offline. A locally saved request is not visible to staff until the server confirms it; a booking remains pending until the team confirms it.</p>
      <p className="big-brothers-actions">
        <Link className="big-brothers-button primary" href="/">Return to Smart Wash ↗</Link>
      </p>
    </section>
  </main>;
}
