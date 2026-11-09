# Smart Wash — project operating contract

## Identity and source lineage
- Product: **Smart Wash**. Signboard tagline: **Sparkling Kasi Deal**. Currency: Botswana pula (P).
- Source: `gatshaayanda/big-brothers-car-wash`; target: `gatshaayanda/smart-wash`, branch `main`.
- Clean baseline: `b104afc`. Original media commit: `250f086`.
- The original Big Brothers repository and its customer data must never be changed or reused.
- Authentic media: `public/images/smart-wash-sign.jpg` and `public/videos/smart-wash-location.mp4`. Do not use inherited Big Brothers wash-bay footage or promotional imagery.

## Architecture and workflows
- Next.js 15 App Router, React 19, TypeScript, Firebase client/Admin SDK.
- Public booking and walk-in intake: `src/app/page.tsx`.
- Customer account and receipts: `src/app/account`, `src/app/receipt`.
- Staff/admin operations: `src/app/admin`.
- Booking, queue, receipt, notification and upload handlers: `src/app/api`.
- Firestore helpers: `src/lib/firebase/big-brothers-data.ts`. Legacy module names are retained temporarily to protect stable imports; they must connect only to Smart Wash infrastructure.
- Preserve inherited booking, walk-in, account, receipt, admin CRUD, authentication, upload, notification and chatbot/help workflows.

## Dedicated Firebase project — mandatory
- Smart Wash must use a new Firebase project. No Vula/Big Brothers project ID, credentials, customer data or deployment identifiers may be reused.
- Client config: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, optional measurement/VAPID values.
- Server config: `FIREBASE_PROJECT_ID` and `FIREBASE_ADMIN_KEY`. Service-account `project_id` must match `FIREBASE_PROJECT_ID`.
- `.env.example` is intentionally blank. `.firebaserc` has a placeholder until the owner creates the project. Do not deploy rules or enable live data until configured.
- Review Firestore rules/indexes and upload credentials against the new project. Never make collections public to bypass permission errors.

## Protected behavior
- Preserve PWA installation lifecycle, branded dismissible card, native prompt on explicit user click, embedded-browser handling, iOS guidance, service-worker update flow and offline draft semantics. Rebrand/cache-namespace changes only.
- Preserve the inherited chatbot/help behavior and its real actions; adapt identity/content only.
- Preserve customer ownership checks and staff authorization. Distinguish local drafts from server-confirmed records. Never claim a booking, upload, payment, message, notification or receipt succeeded without backend confirmation.
- Keep existing booking, queue, account, receipts, uploads and admin operations working.

## Visual and content standard
- The actual Iteration 13 `docs/assets/washride-home-reference.jpeg` was opened and inspected. Transfer its compact mobile-first hierarchy, purposeful media, dominant primary action, organized secondary journeys and polished component system; do not copy WashRide branding.
- Compactness applies to homepage, booking, customer account, receipts and admin—not only the landing page.
- Apply the Operational Transparency Standard: show real activity and outcomes, never fake progress.
- Smart Wash palette: blue/cyan and navy derived from the supplied signboard. Use the supplied location video as homepage hero media and signboard photograph as poster/fallback.
- Do not invent an address, hours, phone number, price, discount, review or service claim. Publish only prices verified from the signboard or owner.

## Commands and QA
```bash
npm install
npm run verify:identity
npm run lint
npx tsc --noEmit
npm run build
```
Test booking, walk-in, customer ownership/receipts, staff login and CRUD, mobile layouts, offline draft sync, install/update and chatbot. Review the complete diff. A GitHub push is not a build or deployment. The owner handles Vercel unless delegated.
- Latest verified checkpoints: baseline `b104afc`; media `250f086`. Do not declare QA complete until local checks and customer/admin visual QA pass.
