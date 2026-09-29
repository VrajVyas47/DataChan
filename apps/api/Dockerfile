FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

RUN npm install
RUN npm run build --workspace=@datachan/shared-types
RUN npm run build --workspace=@datachan/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 5000
CMD ["node", "apps/api/dist/server.js"]
