## Recommended Database: Neon Serverless PostgreSQL

To connect to **Neon** (`https://neon.tech`):
1. Create a free PostgreSQL project on Neon.
2. Copy your connection string from the Neon dashboard (e.g., `postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require`).
3. In your `.env` file (and in your Vercel Project Environment Variables):
   ```env
   DATABASE_URL="postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require"
   ```
4. Push your schema to Neon:
   ```bash
   npx prisma db push
   ```
5. All your users, reviews, and history will persist permanently in Neon.

## Running Locally

1. Copy `.env.example` to `.env` and fill in your `DATABASE_URL` (Neon or any PostgreSQL).
2. Start the application:
   ```bash
   npm run dev
   ```
   Or with Docker:
   ```bash
   docker compose up -d
   ```
3. Open `http://localhost:3000`.
4. Without SMTP settings, registration OTP emails are logged in the console.

## If Docker is not available

You need a PostgreSQL server and a `.env` with a reachable `DATABASE_URL`, then run:

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

The web application still uses only `http://localhost:3000`.

## If Docker says `npm ci` needs package-lock.json

Use the included Dockerfile. It intentionally uses `npm install`, because this project does not require a committed package-lock file for the Docker build.

If an older extracted copy still contains `RUN npm ci`, replace that line with:

```dockerfile
RUN npm install --no-audit --no-fund --legacy-peer-deps
```

Then rebuild without cache:

```powershell
docker compose down

docker compose build --no-cache

docker compose up
```

Open http://localhost:3000.
