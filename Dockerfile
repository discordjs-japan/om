# syntax=docker/dockerfile:1

FROM node:18.19.0 AS deps
ARG NODE_ENV=production
WORKDIR /app
COPY ./package*.json ./
RUN npm ci

FROM node:18.19.0 AS builder
ARG NODE_ENV=development
WORKDIR /app
COPY ./build.js ./
COPY ./package*.json ./
RUN npm i -g npm@10.2.5 && npm ci
COPY ./src/ ./src/
RUN npm run build

FROM node:18 AS model-fetch

WORKDIR /app
RUN wget https://github.com/jpreprocess/jpreprocess/releases/download/v0.6.1/naist-jdic-jpreprocess.tar.gz \
    && tar xzf naist-jdic-jpreprocess.tar.gz \
    && rm naist-jdic-jpreprocess.tar.gz
RUN wget http://downloads.sourceforge.net/open-jtalk/hts_voice_nitech_jp_atr503_m001-1.05.tar.gz \
    && tar xzf hts_voice_nitech_jp_atr503_m001-1.05.tar.gz \
    && rm hts_voice_nitech_jp_atr503_m001-1.05.tar.gz

FROM gcr.io/distroless/nodejs18-debian12:nonroot AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY ./package.json ./
COPY --from=builder /app/dist/ ./dist/
COPY --from=deps /app/node_modules/ ./node_modules/
COPY --from=model-fetch /app/ ./model/
CMD ["dist/main.js"]
