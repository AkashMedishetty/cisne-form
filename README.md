# CIBC — Photo Submission + Admin

A mobile-first web app where people submit their **name**, **email**, and a **photo**
(uploaded or captured live from the camera). An admin panel lists every submission and
exports the data as an **Excel sheet** or a **ZIP** of all photos (renamed to each
person's name) plus the sheet.

- **Frontend / backend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **Database:** MongoDB (unique index on email — no duplicate emails)
- **File storage:** Vercel Blob
- **Exports:** `.xlsx` via ExcelJS, `.zip` via JSZip
- **Admin auth:** single password + signed (JWT) httpOnly session cookie

## Features

- Name + email + photo form, with **client and server validation**.
- **Email is unique** — the same email cannot submit twice (enforced by a MongoDB
  unique index, with a friendly error before any upload happens).
- **Take a photo** uses the live camera (`getUserMedia`) on desktop and mobile, and
  falls back to the native camera/file picker if the camera isn't available.
- **Upload a photo** from disk or gallery.
- Stored photos and exported files are **renamed to the submitter's name**
  (e.g. `jane-doe.jpg`), with automatic de-duplication for identical names.
- **Admin panel** (`/admin`): searchable table (desktop) / cards (mobile), thumbnails,
  per-row delete (removes the blob too), and one-click exports.
- Fully **responsive**, mobile-first layout.

## Project structure

```
app/
  page.tsx                      Public submission form
  admin/page.tsx                Admin dashboard (gated by middleware)
  admin/login/page.tsx          Admin login
  api/submit/route.ts           POST a submission (validate → blob → mongo)
  api/admin/login|logout        Session cookie set/clear
  api/admin/submissions         GET list, DELETE /[id]
  api/admin/export/xlsx         GET Excel sheet
  api/admin/export/zip          GET ZIP (photos renamed + sheet)
components/
  SubmissionForm.tsx            Form + validation + submit
  PhotoCapture.tsx              Camera capture / upload / preview
  AdminDashboard.tsx            Admin UI
lib/
  mongodb.ts  auth.ts  validation.ts  slug.ts  export.ts
middleware.ts                   Protects /admin and /api/admin
```

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable               | What it is                                                                 |
| ---------------------- | -------------------------------------------------------------------------- |
| `MONGODB_URI`          | MongoDB connection string (e.g. from MongoDB Atlas).                       |
| `MONGODB_DB`           | Database name (optional, defaults to `cibc`).                             |
| `BLOB_READ_WRITE_TOKEN`| Vercel Blob read/write token.                                              |
| `ADMIN_PASSWORD`       | The password for `/admin`.                                                 |
| `ADMIN_SESSION_SECRET` | Long random string used to sign the session cookie (`openssl rand -base64 48`). |

**MongoDB:** create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas),
create a database user, and copy the connection string into `MONGODB_URI`. The
`submissions` collection and its unique email index are created automatically.

**Vercel Blob:** in the Vercel dashboard go to **Storage → Blob**, create a store, and
copy the token from the store's **.env.local** tab into `BLOB_READ_WRITE_TOKEN`. When
deployed on Vercel with a connected Blob store, this is injected automatically.

### 3. Run

```bash
npm run dev
```

- Public form: <http://localhost:3000>
- Admin panel: <http://localhost:3000/admin> (you'll be asked for the admin password)

> Note: in local dev the session cookie is non-`Secure` so it works over `http`.
> In production (`npm run build && npm start`, or on Vercel) it is `Secure` and
> requires HTTPS.

## Deploying to Vercel

1. Push the repo to GitHub and import it into Vercel.
2. Add a **Blob** store under Storage (auto-sets `BLOB_READ_WRITE_TOKEN`).
3. Add the env vars `MONGODB_URI`, `MONGODB_DB` (optional), `ADMIN_PASSWORD`, and
   `ADMIN_SESSION_SECRET` in the project settings.
4. Deploy. The form is at `/`, admin at `/admin`.

## Notes & limits

- Max photo size: **4 MB** (`lib/validation.ts` → `MAX_FILE_MB`), kept under Vercel's
  ~4.5 MB serverless request body limit. Enforced on both the client and server.
- Accepted types: JPEG, PNG, WebP, HEIC/HEIF.
- The ZIP export downloads every photo into memory to build the archive; for very
  large datasets (thousands of large photos) consider a streaming/background job.
- ESLint is intentionally skipped during `next build` (TypeScript checks still run).
  Run `npm run typecheck` for types.
```
