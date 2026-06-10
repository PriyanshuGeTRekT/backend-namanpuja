# Backend (Express + Prisma) — dev container for `docker compose`.
# Debian-slim (not alpine) + openssl, because Prisma's query engine needs
# a glibc/OpenSSL runtime to start reliably.
FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything first so `prisma generate` (postinstall) sees the schema.
# .dockerignore keeps node_modules / dist / .env out of the build context.
COPY . .

RUN npm install

EXPOSE 4000

# On startup: apply migrations, seed (idempotent upserts), then run the API.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && npm run dev"]
