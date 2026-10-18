FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stateless runtime: data lives in Supabase, files in Cloudflare R2.
# Configure SUPABASE_URL, SUPABASE_ANON_KEY, R2_*, APP_ORIGIN (and optional
# TURNSTILE_*) on the host. Do not set SUPABASE_SERVICE_ROLE_KEY here.
FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
