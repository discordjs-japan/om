# syntax=docker/dockerfile:1

FROM node:18 AS deps
ARG NODE_ENV=production
WORKDIR /app
COPY ./package*.json .
RUN npm install

FROM deps AS builder
ARG NODE_ENV=development
WORKDIR /app
COPY ./src/ ./src/
RUN npm install
RUN --mount=type=bind,source=build.js,target=build.js \
    npm run build

FROM gcr.io/distroless/nodejs18-debian12:nonroot AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist/ ./dist/
COPY ./package.json ./
COPY --from=deps /app/node_modules/ ./node_modules/

CMD ["dist/main.js"]
