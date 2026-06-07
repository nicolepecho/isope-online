# iSOPE Online — Deployment Setup Guide

This guide walks a developer through everything needed to clone, configure, and run iSOPE Online from scratch. Follow each section in order.

---

## Prerequisites

Make sure the following are installed on your machine before starting:

- [Node.js](https://nodejs.org/) version 18 or higher
- npm (comes with Node.js)
- [Git](https://git-scm.com/)
- A [Supabase](https://supabase.com/) account
- A [Google Cloud Console](https://console.cloud.google.com/) account
- A Gmail account to use as the system email sender (for forgot password emails)

---

## Step 1 — Clone the Repository

```bash
git clone <your-repository-url>
cd isope-online
```

Then install dependencies:

```bash
npm install
```

---

## Step 2 — Set Up Supabase

Supabase is the database and file storage provider for this project.

### 2.1 Create a new Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Give it a name (e.g. `isope-online`), set a strong database password, and choose a region.
4. Wait for the project to finish provisioning (about 1–2 minutes).

### 2.2 Run the database schema

1. In your Supabase project, go to the **SQL Editor** in the left sidebar.
2. Open the file `database/schema.sql` from this repository.
3. Copy the entire contents and paste it into the SQL Editor.
4. Click **Run**.

This creates all the tables, sequences, and storage buckets the system needs.

### 2.3 Collect your Supabase credentials

Go to **Project Settings → API** in Supabase. You will need:

| What | Where to find it | Env variable name |
|---|---|---|
| Project URL | "Project URL" section | `NEXT_PUBLIC_SUPABASE_URL` |
| Anon / public key | "Project API keys" → `anon public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Service role key | "Project API keys" → `service_role` | `SUPABASE_SERVICE_KEY` |

> **Important:** The service role key bypasses all database security rules. Never expose it publicly. Keep it only in your `.env.local` file and in your hosting platform's environment variables. It must never have the `NEXT_PUBLIC_` prefix.

---

## Step 3 — Set Up Google OAuth

Google sign-in is the primary login method for students, org accounts, and advisers.

### 3.1 Create a Google Cloud project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Click the project dropdown at the top → **New Project**.
3. Name it (e.g. `iSOPE Online`) and click **Create**.

### 3.2 Configure the OAuth consent screen

1. In the left sidebar, go to **APIs & Services → OAuth consent screen**.
2. Select **External** and click **Create**.
3. Fill in:
   - **App name**: iSOPE Online
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **Save and Continue** through the rest of the screens (scopes and test users can be left as default).

### 3.3 Create OAuth credentials

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Select **Web application** as the application type.
4. Set the name (e.g. `iSOPE Web Client`).
5. Under **Authorized redirect URIs**, add:
   - For local development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
6. Click **Create**.
7. Copy the **Client ID** and **Client Secret** that appear.

| What | Env variable name |
|---|---|
| Client ID | `AUTH_GOOGLE_ID` |
| Client Secret | `AUTH_GOOGLE_SECRET` |

> **Note:** Only email addresses ending in `@iacademy.edu.ph` are allowed to sign in. This is hardcoded in `src/app/api/auth/[...nextauth]/route.ts`. If the allowed domain changes, update the `allowedDomain` constant in that file.

---

## Step 4 — Set Up Gmail App Password (Forgot Password Email)

The forgot password feature sends password reset emails via Gmail SMTP. A regular Gmail password does not work here — you need an **App Password**.

### 4.1 Enable 2-Step Verification on the Gmail account

1. Go to [https://myaccount.google.com/security](https://myaccount.google.com/security).
2. Under **How you sign in to Google**, enable **2-Step Verification** if it is not already on.

### 4.2 Generate an App Password

1. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
2. Under **App name**, type a label such as `iSOPE Online`.
3. Click **Create**.
4. Google will display a 16-character password (shown in groups of 4, e.g. `abcd efgh ijkl mnop`).
5. Copy this password exactly as shown, spaces included — the system strips spaces automatically.

| What | Env variable name |
|---|---|
| Gmail address used | `SMTP_USER` |
| App password | `SMTP_PASS` |

---

## Step 5 — Generate a NextAuth Secret

NextAuth requires a random secret string to sign session tokens. Generate one by running:

```bash
openssl rand -base64 32
```

If you do not have `openssl`, you can use any random string generator. Copy the output — this becomes `NEXTAUTH_SECRET`.

---

## Step 6 — Create the `.env.local` File

Create a file named `.env.local` in the root of the project. Copy the template below and fill in every value using what you collected in the steps above.

```env
# Google OAuth
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_secret

# Supabase — public (safe to expose to the browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Supabase — private (server only, never use NEXT_PUBLIC_ prefix here)
SUPABASE_SERVICE_KEY=your_service_role_key

# SMTP — Gmail for forgot password emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@iacademy.edu.ph
SMTP_PASS=your_app_password
```

> **For production deployment:** Set these same variables in your hosting platform's environment settings (e.g. Vercel → Project → Settings → Environment Variables). Update `NEXTAUTH_URL` to your production domain.

---

## Step 7 — Create the First OSAS User

OSAS is the admin role. OSAS users log in with a username and password (not Google). There is no UI to create an OSAS account — it must be inserted directly into the database.

1. Go to your Supabase project → **Table Editor → users**.
2. Click **Insert row** and fill in the following columns:

| Column | Value |
|---|---|
| `Email` | Any email (can be a placeholder, e.g. `osas@iacademy.edu.ph`) |
| `Name` | Full name of the OSAS user |
| `Username` | The login username (e.g. `osas_admin`) |
| `PasswordHash` | A bcrypt hash of the chosen password (see below) |
| `Role` | `osas` |

### How to generate a bcrypt hash for the password

Run the following in your terminal (requires Node.js):

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your_chosen_password', 10).then(h => console.log(h));"
```

Paste the output into the `PasswordHash` column.

> After this, the OSAS user can log in at `/login` using their username and password.

---

## Step 8 — Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The system should be fully functional.

---

## Step 9 — Deploying to Production (Vercel)

Vercel is the recommended hosting platform for Next.js projects.

1. Push the repository to GitHub.
2. Go to [https://vercel.com](https://vercel.com) and import the repository.
3. In the Vercel project settings, go to **Environment Variables** and add every variable from your `.env.local` file.
4. Change `NEXTAUTH_URL` to your production domain (e.g. `https://isope-online.vercel.app`).
5. Go back to Google Cloud Console → your OAuth credentials → add your production redirect URI: `https://yourdomain.com/api/auth/callback/google`.
6. Deploy.

---

## Summary of All Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret |
| `NEXTAUTH_URL` | Yes | Full URL of the app (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Yes | Random secret for signing session tokens |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (server-side only) |
| `SMTP_HOST` | Yes | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | Yes | SMTP port (use `587` for Gmail) |
| `SMTP_USER` | Yes | Gmail address used to send reset emails |
| `SMTP_PASS` | Yes | Gmail app password (16 characters) |
