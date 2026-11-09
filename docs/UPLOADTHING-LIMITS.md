# Smart Wash UploadThing limits

The Smart Wash UploadThing router is configured for one file per upload:
- **Images:** up to 4 MB
- **Videos:** up to 16 MB
- **PDFs:** up to 4 MB

UploadThing handles service media, staff gallery publishing and receipt-linked customer photo/video submissions. Customer media is stored as an UploadThing URL and file key in Firestore after the receipt-token endpoint validates the submission and explicit public-display consent. Staff moderation is required before customer submissions can appear in the public gallery.

These are the repository's configured endpoint limits, not a guarantee about the connected UploadThing account's plan, environment configuration, or network throughput. Uploading requires a working internet connection; selecting a file offline does not upload or publish it.

If an upload stalls or is rejected despite meeting these configured limits, check the deployment's `UPLOADTHING_TOKEN`, UploadThing endpoint logs, network connection, and current provider plan/settings. Do not increase limits without confirming the provider accepts them.

Firebase Storage is not part of the Smart Wash media workflow. Do not deploy Firebase Storage rules or add Firebase Storage upload dependencies.
