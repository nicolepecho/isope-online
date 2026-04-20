# iSOPE Thesis Application

A Next.js 15 web application built for iSOPE Online with Supabase backend integration, role-based authentication, evaluation dashboard support, requirements management, member upload, and password reset workflows.

## Features

- Google OAuth and username/password authentication via `next-auth`
- Domain-restricted sign-in for `iacademy.edu.ph`
- Role-based access for `member`, `adviser`, `osas`, and `org`
- Protected pages via Next.js middleware
- Supabase database integration for users, organizations, evaluations, requirements, and comments
- Supabase storage support for requirement PDF files
- Signup completion flow for first-time Google users
- Forgot password and reset password email workflow with SMTP
- Member upload via Excel import
- Dashboard and organization-specific evaluation pages

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- NextAuth.js
- Supabase
- Nodemailer
- bcryptjs

## Prerequisites

- Node.js 20+ installed
- npm installed
- Supabase project with configured database tables and storage bucket
- SMTP credentials for password reset emails

## Setup

1. Clone the repository

git clone your-repository-url
cd isope-online

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the project root.

4. Add the required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=your_supabase_service_key
NEXTAUTH_SECRET=your_nextauth_secret
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM="Your App <no-reply@example.com>"
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESET_PASSWORD_SECRET=your_password_reset_secret
```

5. Run development server

npm run dev

6. Open browser

http://localhost:3000


> Note: `NEXT_PUBLIC_APP_URL` is used to build password reset links. If it is not set, the app falls back to `NEXTAUTH_URL` or request origin.

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Build for Production

```bash
npm run build
npm run start
```

## Important Project Behavior

- The auth system only accepts emails from `iacademy.edu.ph`.
- Google sign-ins create a user record automatically if the email is not already registered.
- The signup completion flow assigns a username and password after first Google login.
- Password reset links expire after 30 minutes.
- Middleware protects all app routes except login, signup, forgot-password, reset-password, and password reset APIs.

## Supabase Schema Expectations

The app references these backend objects:

- `users` table: stores `Email`, `Username`, `PasswordHash`, `Role`, `Name`, and `id`
- `orgs` table: stores organization records including `email`, `adviseremail`, and `username`
- `requirementcomments` table: stores requirement-related comments
- `requirement-pdfs` storage bucket: stores PDFs for requirement documents
- Additional tables for evaluations and member data are used through the dashboard routes

## Project Structure

- `src/app/`: application pages, layouts, providers, and API routes
- `src/app/api/`: server API routes for auth, signup, password reset, uploads, comments, and requirement PDFs
- `src/app/lib/`: shared utilities, Supabase client setup, and password reset token helpers
- `src/app/ui/`: reusable UI components and snippets
- `src/app/dashboard/`: dashboard UI and organization-specific pages

## Notes

- `src/app/page.tsx` currently includes a sample Supabase query for `products`; update this to fit your app content as needed.
- API route `src/app/api/test/` contains sample debug endpoints.
- The app uses `next-auth` with callbacks to store roles in JWT tokens and session objects.

# Researchers
Developed as part of the thesis project:

iSOPE Online: A Centralized Student Organization Accreditation Management System for iACADEMY

## License

This project is intended for academic and institutional use.
