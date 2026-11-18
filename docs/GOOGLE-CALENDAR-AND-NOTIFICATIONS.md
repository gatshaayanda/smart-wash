# Smart Wash — Google Calendar and visit notification setup

## Google Calendar OAuth

The customer account can connect a customer's own Google Calendar. Smart Wash requests only the `calendar.events` scope plus basic OpenID/email identity. It does not read the customer's existing calendar events.

When connected:
- Confirmed Smart Wash bookings are added to the customer's primary calendar.
- When staff confirms, reschedules or cancels a visit, the event is synchronized immediately by the staff booking-status operation. The customer account also runs a catch-up sync when opened.
- If staff cancels a visit, its Smart Wash calendar event is removed on the next account sync.
- Requested/unconfirmed visits are never written to Google Calendar.
- Calendar events carry 60-minute and 10-minute popup reminders.
- Disconnecting stops future sync. Events already written to the customer's calendar are left in place.

### Google Cloud setup

1. Open the Google Cloud project that will own the OAuth consent screen.
2. Enable **Google Calendar API**.
3. Configure the OAuth consent screen. Add the `openid`, `email`, and `https://www.googleapis.com/auth/calendar.events` scopes. Add internal testers as test users while the app is in testing; complete Google's verification requirements before broad public rollout if Google requires it for the selected audience/scope.
4. Create an OAuth client ID of type **Web application**.
5. Add the production origin `https://smart-wash-neon.vercel.app` (and any approved custom domain) to Authorized JavaScript origins.
6. Add this exact production redirect URI to Authorized redirect URIs:

   `https://smart-wash-neon.vercel.app/api/calendar/google/callback`

7. For local testing, add origin `http://localhost:3000` and redirect URI `http://localhost:3000/api/calendar/google/callback`.

### Server environment variables

Set these in the Smart Wash Vercel project and in local `.env.local` when testing:

- `GOOGLE_CALENDAR_CLIENT_ID` — OAuth web client ID.
- `GOOGLE_CALENDAR_CLIENT_SECRET` — OAuth web client secret. Server only; never use a `NEXT_PUBLIC_` prefix.
- `GOOGLE_CALENDAR_REDIRECT_URI` — exact callback URL for the environment.
- `GOOGLE_CALENDAR_STATE_SECRET` — long random secret used to sign and verify OAuth state.
- `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` — base64-encoded 32-byte key used to encrypt refresh tokens before Firestore storage.

Generate independent secrets, for example:

```bash
openssl rand -hex 32
openssl rand -base64 32
```

Use the hex output for `GOOGLE_CALENDAR_STATE_SECRET` and the base64 output for `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY`. Keep all OAuth credentials and encryption keys in server-side environment variables only.

The OAuth callback stores only an AES-256-GCM encrypted refresh token and the connected Google email in `googleCalendarConnections/{customerUid}`. Access tokens are refreshed server-side. Firebase Admin access is restricted to the Smart Wash server.

## Customer visit notifications

- Customers explicitly opt in from their account; no browser permission prompt is shown on page load.
- A staff confirmation, cancellation or completion can send one relevant push update to an opted-in customer.
- A daily Vercel Cron run checks confirmed bookings in the next 24 hours and sends one reminder per booking.
- Important status remains visible in the customer's account if push is unavailable or missed.
- Special-offer preferences are separate from booking updates. WhatsApp follow-up is not requested merely because someone opened an account.

### Vercel Cron

The project schedules `/api/notifications/reminders` daily at 01:00 UTC (03:00 Botswana time, with Vercel's plan-dependent scheduling precision). Vercel sends `Authorization: Bearer <CRON_SECRET>` when the `CRON_SECRET` environment variable is configured.

Set a strong `CRON_SECRET` in Vercel. The existing `SMART_WASH_REMINDER_CRON_SECRET` remains accepted for manual POST runs. The daily reminder endpoint is idempotent per booking via `reminderSentAt`.

A daily schedule is deliberately used rather than a sub-hour schedule so it remains compatible with Vercel plans that restrict cron frequency. Immediate staff status updates are sent separately when the customer has opted in.

## Verification

1. Connect a test Google account from a signed-in Smart Wash customer account.
2. Confirm the connected email appears in the account.
3. Confirm a test booking as staff and verify one event appears in the customer's primary Google Calendar.
4. Change the confirmed booking time and reopen the account; verify the event updates rather than duplicates.
5. Cancel the booking and reopen the account; verify its Smart Wash calendar event is removed.
6. Disconnect and verify the account shows disconnected; existing calendar events should remain.
7. Opt in to push notifications on a supported browser and verify staff confirmation/cancellation/completion updates.
8. Invoke the reminder endpoint with the configured cron secret and verify the returned checked/sent/skipped counts. A reminder is sent only once per booking.
9. Test permission denial, unsupported browsers and missing OAuth configuration; the account must continue to show booking status without claiming notifications/calendar sync succeeded.

Google Calendar authorization and push delivery are external integrations; do not report them as production-verified until tested with configured Google Cloud credentials, Firebase Messaging, and the deployed app.
