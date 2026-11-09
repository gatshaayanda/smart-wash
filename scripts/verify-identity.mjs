import fs from "node:fs";
const read = path => fs.readFileSync(path, "utf8");
const exists = path => fs.existsSync(path);
const failures = [];
const manifest = read("src/app/manifest.ts");
const layout = read("src/app/layout.tsx");
const home = read("src/app/page.tsx");
const sw = read("public/sw.js");
const messagingConfig = read("src/app/api/firebase/messaging-sw-config/route.ts");
const install = read("src/app/pwa-register.tsx");
const generator = read("scripts/generate-icons.mjs");
const env = read(".env.example");
const account = read("src/app/account/page.tsx");
const weather = read("src/components/LocationWeather.tsx");
const bookingWeather = read("src/components/BookingDateWeather.tsx");
const serviceData = read("src/lib/firebase/big-brothers-data.ts");
const admin = read("src/app/admin/big-brothers-dashboard.tsx");
const availability = read("src/app/api/bookings/availability/route.ts");
const receiptServer = read("src/lib/server/big-brothers-receipts.ts");
const loginRoute = read("src/app/api/operations-login/route.ts");
const racingCareer = read("src/app/games/racing-career-hub.tsx");
const adminGate = read("src/app/admin/admin-gate.tsx");
if (!manifest.includes('name: "Smart Wash"') || !manifest.includes('short_name: "Smart Wash"')) failures.push("Smart Wash manifest identity is missing.");
for (const icon of ["smart-wash-icon-180.png","smart-wash-icon-192.png","smart-wash-icon-512.png"]) {
  if (!layout.includes(icon) || !manifest.includes(icon)) failures.push("Icon path is not wired: " + icon);
}
if (!exists("public/smart-wash-icon.svg") || !generator.includes("smart-wash-icon-")) failures.push("Smart Wash SVG icon or PNG generator is missing.");
if (!home.includes('/videos/smart-wash-location.mp4') || !home.includes('/images/smart-wash-sign.jpg')) failures.push("Original Smart Wash video and signboard poster are not wired to the homepage.");
if (!exists("public/images/smart-wash-sign.jpg") || !exists("public/videos/smart-wash-location.mp4")) failures.push("Original Smart Wash media is missing.");
if (!sw.includes("smart-wash-shell-v1") || !sw.includes("smart-wash-game-v1")) failures.push("Smart Wash service-worker cache namespaces are missing.");
if (!sw.includes("__SMART_WASH_FIREBASE_CONFIG__") || !messagingConfig.includes("__SMART_WASH_FIREBASE_CONFIG__") || sw.includes("__BIG_BROTHERS_FIREBASE_CONFIG__")) failures.push("Service-worker messaging configuration is not isolated to Smart Wash.");
if (!install.includes("Install Smart Wash") || !install.includes("SMART WASH")) failures.push("PWA install card is not branded Smart Wash.");
if (env.includes("vulas-car-wash") || read(".firebaserc").includes('"default": "vulas-car-wash"')) failures.push("Source Firebase project ID remains configured.");
for (const file of ["src/app/page.tsx","src/app/layout.tsx","src/app/manifest.ts","src/app/pwa-register.tsx","src/app/iphone-install/page.tsx","src/app/account/page.tsx","src/app/receipt/[token]/ReceiptView.tsx"]) {
  if (read(file).includes("Big Brothers Car Wash") || read(file).includes("BIG BROTHERS CAR WASH")) failures.push("Inherited visible brand remains in " + file + ".");
}
if (!home.includes('const pendingKey = "smart-wash:offline-requests:v1";')) failures.push("Offline draft namespace is not isolated for Smart Wash.");
if (account.includes("big-brothers-car-wash.vercel.app") || /\/videos\/(Bays|Left|Right)\.mp4/.test(account)) failures.push("Customer account still references inherited URLs or media.");
if (!weather.includes("/videos/smart-wash-location.mp4") || /\/videos\/(Bays|Left|Right)\.mp4/.test(weather)) failures.push("Location guide still references inherited videos.");
if (receiptServer.includes("vulas-car-wash") || loginRoute.includes("vulas-car-wash")) failures.push("A Firebase Admin handler still targets the source project.");
if (/Big Brothers|BIG BROTHERS|Vula Car Wash/.test(racingCareer) || /Big Brothers Car Wash|Big Brothers staff/.test(adminGate)) failures.push("Inherited source branding remains in Smart Wash racing or staff access.");
if (weather.includes("-24.6282") || weather.includes("25.9231") || bookingWeather.includes("-24.6282") || bookingWeather.includes("25.9231")) failures.push("Weather still uses inherited source-business coordinates.");
if (!weather.includes("locationConfigured") || !bookingWeather.includes("locationLabel")) failures.push("Weather must use owner-configured Smart Wash location settings.");
if (availability.includes("settings[capacityKey] ?? 4") || availability.includes(": 4;")) failures.push("Booking availability still assumes inherited staffing capacity.");
if (!serviceData.includes("export async function deleteService") || !serviceData.includes("deleteField()")) failures.push("Service CRUD must support deletion and clearing a price safely.");
if (!admin.includes("Add verified signboard services") || !admin.includes("Hide from customers") || !admin.includes("Delete service")) failures.push("Smart Wash admin service catalogue CRUD is incomplete.");
if (failures.length) { console.error("SMART WASH IDENTITY VERIFICATION FAILED"); failures.forEach(item => console.error(" - " + item)); process.exit(1); }
console.log("SMART WASH IDENTITY VERIFIED — dedicated Firebase placeholders, branded manifest/icons, original media, install card and isolated offline namespace.");
