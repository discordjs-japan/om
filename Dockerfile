# syntax=docker/dockerfile:1@sha256:ac85f380a63b13dfcefa89046420e1781752bab202122f8f50032edf31be0021

FROM node:20.10.0-bookworm AS deps
ARG NODE_ENV=production
WORKDIR /app
COPY ./package*.json ./
RUN npm ci

FROM --platform=$BUILDPLATFORM node:20.10.0-bookworm AS builder
ARG NODE_ENV=development
WORKDIR /app
COPY ./build.js ./
COPY ./package*.json ./
RUN npm ci
COPY ./src/ ./src/
RUN npm run build

FROM --platform=$BUILDPLATFORM node:20.10.0-bookworm AS model-fetch

WORKDIR /app
RUN wget https://github.com/jpreprocess/jpreprocess/releases/download/v0.6.1/naist-jdic-jpreprocess.tar.gz \
    && tar xzf naist-jdic-jpreprocess.tar.gz \
    && rm naist-jdic-jpreprocess.tar.gz
RUN wget http://downloads.sourceforge.net/open-jtalk/hts_voice_nitech_jp_atr503_m001-1.05.tar.gz \
    && tar xzf hts_voice_nitech_jp_atr503_m001-1.05.tar.gz \
    && rm hts_voice_nitech_jp_atr503_m001-1.05.tar.gz

FROM gcr.io/distroless/nodejs20-debian12:nonroot@sha256:015be521134f97b5f2b4c1543615eb4be907fadc8c6a52e60fd0c18f7cda0337 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY ./package.json ./
COPY --from=builder /app/dist/ ./dist/
COPY --from=deps /app/node_modules/ ./node_modules/
COPY --from=model-fetch /app/ ./model/
CMD ["dist/main.js"]
