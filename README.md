# AI Code Reviewer

A Next.js 14 + TypeScript + PostgreSQL code-review web app with:

- Account creation protected by a 6-digit email OTP.
- Username/email + password login.
- Server-side sessions in an HttpOnly cookie.
- Forgot/reset password by email.
- Quick local code review and safe rule-based fixes.
- Per-user review history.
- One exposed local port: **3000**. PostgreSQL is private inside Docker Compose.
- Google/Gemini integration is intentionally not included yet.

## 1. Run locally

Requirements:

- Docker Desktop
- Node.js 20+ if you want to run commands outside Docker

Copy the environment file:

```bash
cp .env.example .env
```

Start the app:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Only port **3000** is published to your machine. PostgreSQL is reachable only by the app through Docker's private network.

When SMTP variables are empty, OTP and password-reset emails are printed in the app container logs. To see the code:

```bash
docker compose logs -f app
```

## 2. Email OTP flow

Registration now works as:

1. User enters username, email, password, and confirmation.
2. Server validates the data and stores only a temporary registration challenge.
3. Server generates a random 6-digit OTP.
4. Only a SHA-256 hash of the OTP is stored.
5. The OTP is valid for 10 minutes and has a maximum of 5 attempts.
6. User enters the OTP at `/verify-account`.
7. Only after the OTP is correct is the real `User` row created.
8. A session is created automatically, so the user lands directly on the dashboard.

For production, configure SMTP:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM="AI Code Reviewer <no-reply@your-domain.com>"
```

Do not put an SMTP password, database password, or future Gemini API key in client-side code.

## 3. Quick code review

The reviewer supports:

- Python
- JavaScript
- TypeScript
- Java
- C
- C++
- C#
- Go
- Rust
- PHP

The current review engine is deliberately local and deterministic. It checks common issues such as:

- `eval()` usage
- hard-coded secrets
- TypeScript `any`
- bare Python `except`
- debugging logs
- TODO/FIXME markers
- unvalidated input

The **Review code** button stores the review in the signed-in user's history.

The **Fix detected issues** button applies only the currently implemented safe transformations. It is not a general-purpose AI rewrite.

## 4. Adding Google/Gemini later

The project currently has no Google authentication or Gemini dependency.

Keep the current authentication/session system. Add Google OAuth as another login method rather than replacing the existing email/password flow.

For Gemini code review, add a server-only provider module such as:

```text
src/lib/ai/gemini.ts
```

and call it only from `/api/review` or a server-side service. Never expose `GEMINI_API_KEY` to browser code.

A good architecture is:

```text
reviewer page
    ↓
POST /api/review
    ↓
server review service
    ├── local quick checks
    └── optional Gemini provider
    ↓
review result
    ↓
CodeReview table
```

This keeps Google/Gemini optional and prevents the API key from reaching the browser.

## 5. Deployment

Your deployment platform should provide a PostgreSQL database and environment variables.

Set at minimum:

```env
DATABASE_URL=your-production-postgresql-url
APP_URL=https://your-real-domain.example
SESSION_COOKIE_NAME=session_token
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM=...
```

Run:

```bash
npm ci
npx prisma generate
npx prisma db push
npm run build
npm start
```

For a production project, use versioned Prisma migrations instead of relying permanently on `db push`.

## 6. Important security behavior

- Passwords are hashed with bcrypt.
- Session tokens are random, opaque values stored server-side.
- Session cookies are HttpOnly and Secure in production.
- Registration cannot select the ADMIN role.
- Review history is filtered by the authenticated user's ID.
- OTP values are not stored in plaintext.
- OTP verification is limited to five attempts.
- Password reset invalidates existing sessions.
- The browser never receives the SMTP credentials or database URL.

## 7. Main routes

```text
/
 /register
 /verify-account
 /login
 /forgot-password
 /reset-password
 /dashboard
 /reviewer
 /history
 /profile
 /settings
 /admin
```

API:

```text
POST /api/auth/register
POST /api/auth/verify-otp
POST /api/auth/resend-otp
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password

POST /api/review
POST /api/fix
```


## Docker note
The Docker build copies `prisma/schema.prisma` before `npm install` because the package postinstall script runs `prisma generate`. OpenSSL is installed in all stages for Prisma compatibility.

## AI code review

The reviewer now uses the Gemini API on the server for code analysis and code fixing. Set `GEMINI_API_KEY` in `.env`. The key is never sent to the browser. `GEMINI_MODEL` defaults to `gemini-3.8-flash`; change it if you use another supported Gemini model. Set `AI_FALLBACK_LOCAL=true` only if you want the older local heuristic reviewer as a fallback when Gemini is unavailable.

## Change password

After login, open Settings. The Password section now uses a dedicated password-change API and separate form state from email-change verification. Enter the current password, a new password (8+ characters), and the confirmation.
