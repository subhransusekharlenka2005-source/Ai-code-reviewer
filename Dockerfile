FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma

RUN npm install --no-audit --no-fund --legacy-peer-deps

FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=build /app ./

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate || echo 'Prisma db push deferred; starting server...'; npm start"]
