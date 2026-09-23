# Run locally

## Recommended: Docker

Requirements: Docker Desktop.

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. Open `http://localhost:3000`.
4. Only port `3000` is exposed on your computer. PostgreSQL is private to the Docker network.
5. Without SMTP settings, registration/reset emails are printed in the app logs. View them with `docker compose logs -f app`.

To stop:

```bash
docker compose down
```

To remove the local database too:

```bash
docker compose down -v
```

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
