# QuizPro Platform - How To Set Up

This guide gets the project running from zero on a new machine.

## 1. Prerequisites

- Node.js 20.x or newer
- npm 10.x or newer
- A Firebase project (Auth + Firestore)
- An OpenAI API key (for AI quiz generation)

Optional (only for legacy migration scripts):

- PostgreSQL/Neon connection URL
- Supabase project URL and service role key

## 2. Clone And Install

```bash
git clone <your-repo-url>
cd QuizPro-Platform
npm install
```

## 3. Firebase Project Setup

### 3.1 Create/Configure Firebase project

1. Open Firebase Console.
2. Create a project (or use an existing one).
3. Enable Authentication -> Sign-in method -> Email/Password.
4. Enable Firestore Database (Native mode).

### 3.2 Create a Web app (client credentials)

In Firebase -> Project Settings -> Your Apps -> Web app, copy:

- `apiKey`
- `authDomain`
- `projectId`

### 3.3 Create service account key (server credentials)

1. Firebase -> Project Settings -> Service accounts.
2. Click `Generate new private key`.
3. Save JSON in project root, for example:

```text
quizpro-firebase-service-account.json
```

## 4. Environment Variables

Create `.env.local` in the project root with this template:

```env
# Required - Firebase client (browser)
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"

# Required - Firebase admin (server)
FIREBASE_SERVICE_ACCOUNT_PATH="D:\\path\\to\\QuizPro-Platform\\quizpro-firebase-service-account.json"
# Alternative to PATH: FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Required - AI generation
OPENAI_API_KEY="your_openai_api_key"
# Optional override (defaults to gpt-5.3)
OPENAI_MODEL="gpt-5.3"

# Strongly recommended for production/admin auth hardening
ADMIN_JWT_SECRET="replace-with-a-long-random-secret"

# Optional - only used by legacy migration scripts
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
```

Notes:

- Keep secrets only in local env files. Do not commit them.
- `FIREBASE_SERVICE_ACCOUNT_PATH` must point to a real file on your machine.

## 5. Bootstrap The First Admin User

Admin login expects a Firestore document in `admins` with a bcrypt hash.

### 5.1 Generate password hash

```bash
node -e "console.log(require('bcryptjs').hashSync('ChangeMe123!', 10))"
```

Copy the output hash.

### 5.2 Insert admin doc in Firestore

In Firestore Console:

1. Create collection: `admins` (if not present).
2. Add document (auto ID) with fields:
   - `email` (string): `admin@yourdomain.com`
   - `name` (string): `Super Admin`
   - `passwordHash` (string): `<paste generated hash>`
   - `createdAt` (timestamp): current time
   - `updatedAt` (timestamp): current time

## 6. Run The App

```bash
npm run dev
```

Open:

- App: `http://localhost:3000`
- Admin: `http://localhost:3000/admin/login`

## 7. Quality Checks

```bash
npm run lint
npm run type-check
npm run test
```

For e2e tests:

```bash
npx playwright install
npm run test:e2e
```

## 8. Optional: Legacy Data Migration (Postgres/Supabase -> Firebase)

Use only if you are migrating old data.

Required vars for this script:

- `DATABASE_URL`
- `FIREBASE_SERVICE_ACCOUNT_PATH`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Run:

```bash
npx tsx scripts/migrate-to-firebase.ts
```

## 9. Common Setup Issues

- `Missing Firebase service account...`
  - Fix `FIREBASE_SERVICE_ACCOUNT_PATH` or set `FIREBASE_SERVICE_ACCOUNT` JSON.
- `Invalid API key` or auth client errors
  - Recheck `NEXT_PUBLIC_FIREBASE_*` values.
- Admin login always unauthorized
  - Ensure `admins` doc exists and `passwordHash` is bcrypt (not plain text).
- Firestore index errors in console
  - Open the Firebase-generated index link and create the suggested index.

## 10. Security Checklist Before Sharing/Deploying

- Rotate any previously exposed API keys/service keys.
- Use strong `ADMIN_JWT_SECRET`.
- Keep `.env*` and service-account JSON out of git.
- Restrict Firebase credentials and Firestore/Auth rules per environment.
