# syntax=docker/dockerfile:1

FROM node:18 AS deps
ARG NODE_ENV=production
WORKDIR /app
COPY ./package*.json ./
RUN npm ci

FROM node:18 AS builder
ARG NODE_ENV=development
WORKDIR /app
COPY ./build.js ./
COPY ./package*.json ./
RUN npm ci
COPY ./src/ ./src/
RUN npm run build

FROM gcr.io/distroless/nodejs18-debian12:nonroot AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY ./package.json ./
COPY --from=builder /app/dist/ ./dist/
COPY --from=deps /app/node_modules/ ./node_modules/
CMD ["dist/main.js"]
