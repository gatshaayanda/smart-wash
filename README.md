# Smart Wash

**Sparkling Kasi Deal** — a mobile-first car-wash booking and operations PWA.

## Customer experience
- Book a wash or request a mobile service where enabled.
- Join the on-site walk-in queue with customer and vehicle details.
- See a successful handoff only after the server confirms the request.
- Return to the Smart Wash account for receipts, history and future bookings.

## Staff and owner operations
- Review bookings and walk-in queue entries.
- Manage services, prices, business settings and customer records.
- Record final transaction facts and issue secure receipts.
- Manage customer communications, gallery submissions, reviews and notifications through the protected admin workspace.

## Original Smart Wash media
- Signboard photograph: `public/images/smart-wash-sign.jpg`.
- Location footage: `public/videos/smart-wash-location.mp4`.
- The location video is the homepage hero; the signboard image is its poster/fallback and authentic brand reference. The inherited Bays.mp4, Left.mp4 and Right.mp4 files have been removed.
- Do not show inherited Big Brothers promotional media or brand identity in Smart Wash customer surfaces.

## Smart Wash Firebase project
Smart Wash uses the owner-designated Firebase project `exquisite-waterproof-services`. The public web configuration is documented in `.env.example`; configure the same project ID and a matching private service-account key in the deployment environment:

- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
- Optional: `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- Server-only: `FIREBASE_PROJECT_ID`, `FIREBASE_ADMIN_KEY`
- Existing handler secret names retained for compatibility: `SMART_WASH_OPERATIONS_WORD`, `SMART_WASH_REMINDER_CRON_SECRET`. Use new Smart Wash secrets only.

The service account JSON must belong to the same project as `FIREBASE_PROJECT_ID`. The `.firebaserc` default target is already set to `exquisite-waterproof-services`. Never reuse source credentials or customer records. The Admin → Services screen can add the nine clearly legible signboard prices in one explicit action, then edit, hide/unhide or delete each service. Four incomplete signboard prices remain excluded until confirmed. Admin weather coordinates and booking capacity are intentionally unset until the owner configures the Smart Wash location and actual staffing.

## Media uploads
UploadThing handles customer ride submissions, staff gallery publishing and service media. Set the private `UPLOADTHING_TOKEN` in the deployment environment. Firebase Storage is not used; there are no Firebase Storage rules to publish.

## Development
Node.js 20+ and npm:
```sh
npm install
npm run verify:identity
npm run lint
npx tsc --noEmit
npm run build
```
A successful push is not proof of a passing build or production deployment. Verify Firebase, authorization, WhatsApp handoff, notifications, PWA installation, offline behavior, service catalogue CRUD, and owner-configured location/capacity settings separately.

## Service catalogue
The signboard photograph is the source of truth. Some prices are not legible enough to transcribe safely from the supplied image. Do not seed guessed amounts; verify unclear prices with the owner before publishing them in Admin → Services.
