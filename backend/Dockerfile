FROM node:24.21.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Also the target for the one-off migrate/seed service: it has the Prisma CLI and the compiled seed.
FROM deps AS build
COPY . .
# prisma generate only reads the schema; the URL is a placeholder, not a real connection.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate && npm run build

FROM node:24.21.0-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24.21.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
