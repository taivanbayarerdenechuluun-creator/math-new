# IQ MATH production image (PostgreSQL)
FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Production-д PostgreSQL provider ашиглана
RUN node scripts/use-db.mjs postgresql && npx prisma generate && npx next build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
RUN mkdir -p storage/uploads && chown -R node:node storage
USER node
EXPOSE 3000
# Эхлэхдээ migration-уудыг хэрэгжүүлнэ (байгаа өгөгдлийг устгахгүй)
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p 3000"]
