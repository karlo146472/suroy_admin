# SUROY Admin (adminWeb) — Documentation

The web dashboard that Tourism Administrators use to manage the data behind the SUROY travel app for Santo Tomas, Davao del Norte. It shares one Supabase project (database, auth and storage) with the mobile app, so anything changed here shows up in the app.

---

## 1. What it does

| Area | What an administrator can do |
|---|---|
| **Dashboard** | See totals (destinations, transportation routes, registered users), a map of all destinations, the top destinations and recent activity. |
| **Destinations** | Search and filter the list, see every place on a map, add, edit and delete destinations, upload a photo, set on-site costs. |
| **Categories** | Add, rename and delete the categories used to group destinations. |
| **Transportation** | Add, edit and delete routes: transport type, fare range, duration and instructions for each destination. |
| **Users** | View users and change a user's role. Name and email are read-only. |
| **Activity Log** | Read the history of added, edited and deleted records. |
| **Settings** | Edit the administrator's own profile, change the password, view system information. |

Only accounts whose role is **Tourism Administrator** can sign in. Travelers are refused.

---

## 2. Tech stack

- **React 19** + **TypeScript** (strict), built with **Vite 8**
- **React Router 7** for pages
- **Supabase** (`@supabase/supabase-js`) for auth, database and image storage
- **MapLibre GL JS 6** for maps, with free OpenFreeMap tiles (OpenStreetMap data, no API key)
- **lucide-react** for icons
- **oxlint** for linting
- Plain CSS with variables (no UI framework): `src/styles/`

---

## 3. Getting started

**Requirements:** Node.js and npm, and access to the SUROY Supabase project.

```bash
cd adminWeb
npm install
cp .env.example .env.local     # then fill in the two values below
npm run dev                    # http://localhost:5173
```

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check (`tsc -b`) and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

### Environment variables

Put these in `.env.local` (never commit it):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | The Supabase project URL (the same project as the mobile app) |
| `VITE_SUPABASE_ANON_KEY` | The public **anon** key |

> Only the anon key belongs in the browser. **Never** put the `service_role` key here. Access is protected by database row-level security, not by hiding the key.

---

## 4. Project structure

```
adminWeb/
├─ index.html              Page shell and favicon link
├─ public/                 Static files (favicon.png)
├─ vite.config.ts          Vite settings
└─ src/
   ├─ main.tsx, App.tsx    Entry point and the route table
   ├─ pages/               One file per screen
   │   Login, Dashboard, Destinations, AddDestination, Categories,
   │   Transportation, Users, ActivityLog, Settings, SignOut, NotFound
   ├─ components/
   │   ├─ auth/            RequireAdmin (route guard)
   │   ├─ layout/          AdminLayout, Sidebar, Header, navItems
   │   ├─ ui/              Reusable pieces: DataTable, Modal, ConfirmDialog, Toast,
   │   │                   FormField, PasswordInput, SearchBar, Pagination, StatCard, ...
   │   ├─ map/             MapView (MapLibre wrapper)
   │   ├─ destinations/    DestinationForm
   │   ├─ transportation/  RouteForm, RouteMapPanel
   │   ├─ users/           UserForm, UserDetails
   │   ├─ settings/        AdminProfile, SecuritySettings, SystemInformation
   │   └─ dashboard/       TopDestinations, RecentActivity
   ├─ hooks/               session (signed-in admin), useSectionForm, useToast, ...
   ├─ lib/                 Data access and validation (one file per topic)
   │                       supabase, auth, destinations, categories, transportation,
   │                       users, profile, dashboard, activityLog, destinationImages, ...
   ├─ assets/              Logo and login background image
   └─ styles/              theme.css (colors, spacing), layout, ui, forms, login
```

Pages call functions in `lib/`; `lib/` is the only place that talks to Supabase.

---

## 5. Pages and routes

| Route | Page | Notes |
|---|---|---|
| `/login` | Login | Public. Photo background and a glass sign-in card. |
| `/logout` | SignOut | Ends the session and returns to `/login` with a "signed out" message (shown for 20 seconds). |
| `/` | Dashboard | |
| `/destinations` | Destinations | Search, Category and Status filters, map and table. |
| `/destinations/new` | Add Destination | |
| `/destinations/categories` | Categories | Opened with **Manage Categories**. |
| `/transportation` | Transportation | |
| `/users` | Users | |
| `/activity-log` | Activity Log | |
| `/settings` | Settings | |
| `*` | Not Found | |

Every route except `/login` and `/logout` is wrapped in `RequireAdmin`.

---

## 6. Authentication and access

1. The administrator signs in with email and password through **Supabase Auth**.
2. The app then reads the account's row in `profiles`. Only `role = 'Tourism Administrator'` is accepted. Anyone else is signed straight back out with "This account does not have access to the admin dashboard."
3. A wrong email and a wrong password show the same message ("Incorrect email or password."), so the form can't be used to discover which emails exist.
4. `RequireAdmin` sends signed-out visitors to `/login` and returns them to the page they wanted after signing in.
5. If a signed-in account stops being an administrator, the session is ended.

**Important:** the interface check only controls what is shown. The real protection is **row-level security** in Supabase (the `is_admin()` function). Even a tampered browser cannot read or change admin data without an administrator's session.

---

## 7. Data

Tables the dashboard reads or writes (defined in the shared `supabase/schema.sql` of the mobile app project):

| Table | Used for |
|---|---|
| `profiles` | Users, names, emails and roles. Roles are **Traveler** and **Tourism Administrator**. |
| `destinations` | Places: name, category, barangay, latitude/longitude, entrance fee, hours, contact, activities, facilities, status (Standard or Featured), photo. |
| `categories`, `destination_categories` | Category list and the link to each destination. |
| `destination_expenses` | Typical on-site costs per person (a meal, a room, an activity). |
| `transportation_options` | Routes: destination, transport type, fare min/max, duration, instructions. |
| `trips`, `trip_destinations`, `favorites` | Read only, for statistics. |
| `activity_log` | Read only: who did what (**Added**, **Edited**, **Deleted**), the module, a description and the time. |

**Storage:** photos are uploaded to the public `destination-images` bucket. Accepted types are JPEG, PNG and WebP, up to 5 MB. Large photos are scaled down (longest side 1200 px) and saved as JPEG in the browser before upload. Only administrators may upload.

**Activity log entries are written by the database, not by this app.** The dashboard only displays them, so an action appears in the log only if the matching database trigger exists.

### Costs and the mobile app

Accommodation and Food destinations should have at least one cost row. Without one, the mobile app treats the place's price as unknown and leaves it out of budget lists instead of guessing a price. Transportation routes feed the trip cost calculation in the same way.

---

## 8. Maps

The dashboard, the Destinations page and the destination form use `components/map/MapView.tsx`:

- Pins for destinations, with a popup and a highlighted selected pin.
- A location picker in the form: click the map or drag the pin to set the latitude and longitude.
- A dashed line between a route's two ends on the Transportation page.

**Production note (why the worker URL is set):** MapLibre 6 draws tiles in a background worker. By default it looks for the worker file next to its own code, which does not exist in the production build, so the deployed map showed only pins on a white background. `MapView.tsx` fixes this by importing the worker with `?worker&url` and calling `setWorkerUrl(...)`. Keep this when upgrading MapLibre.

---

## 9. Design

Colors, spacing, radii and type sizes are CSS variables in `src/styles/theme.css`, with a dark theme that follows the system setting.

| Token | Light | Use |
|---|---|---|
| `--primary` | `#2E7D32` | Main green, buttons, active items |
| `--secondary` | `#66BB6A` | Accents |
| `--soft` | `#E8F5E9` | Light green backgrounds |
| `--accent` | `#FFB300` | Highlights, selected pin |
| `--bg` / `--surface` | `#F8F9FA` / `#FFFFFF` | Page and card backgrounds |
| `--error` | `#D32F2F` | Errors and destructive actions |

The login page uses a full-page photo with a green overlay and a frosted-glass card (`src/styles/login.css`). Its text colors are set inside the card so they stay readable in both themes.

---

## 10. Deployment (Vercel)

1. Push the repository and import it in Vercel (framework preset: **Vite**).
2. Add the two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.
3. Build command `npm run build`, output directory `dist`.
4. Deploy. Every push to the connected branch redeploys.

If refreshing a page such as `/destinations` shows a 404, add a `vercel.json` so every path serves the app:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Environment variables are baked in at build time, so after changing them you must redeploy.

---

## 11. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Map is white with only pins (deployed site) | The worker URL is not set. Check `MapView.tsx` still calls `setWorkerUrl`, rebuild, and confirm `maplibre-gl-worker-….js` appears in the build output. If the console says "Worker failed to load", this is the cause. |
| Map is white on one network only | That network may block `tiles.openfreemap.org`. Try another network. |
| "Could not load the dashboard" | A table the dashboard reads is missing or blocked by row-level security. Check the browser console and the Supabase schema. |
| Sign-in says "This account does not have access" | The account's `profiles.role` is not **Tourism Administrator**. |
| Sign-in says "Could not connect" | No internet, or `VITE_SUPABASE_URL` is wrong. |
| Activity Log is empty | The database triggers that write `activity_log` are not installed or have not fired yet. |
| Changes to `.env.local` have no effect | Restart `npm run dev`; on Vercel, redeploy. |

---

## 12. Known limits

- The activity log records added, edited and deleted actions only; sign-ins are not logged.
- The free OpenFreeMap tile service has no uptime guarantee. For heavy use, host your own tiles or use a paid provider.
- The map needs an internet connection; the dashboard has no offline mode.
- No automated tests are included; use `npm run lint` and `npm run build` to check changes.
