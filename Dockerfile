# syntax=docker/dockerfile:1@sha256:dbbd5e059e8a07ff7ea6233b213b36aa516b4c53c645f1817a4dd18b83cbea56

FROM node:20.12.2-bookworm@sha256:a7ff24fb730330f24ecf5a485e13e2e92682a115a56a16cade83102f14cbe01c AS deps
ARG NODE_ENV=production
WORKDIR /app
RUN npm config set cache /.npm
COPY ./.husky/install.mjs ./.husky/
COPY ./package*.json ./
RUN --mount=type=cache,id=npm-$TARGETPLATFORM,target=/.npm \
    npm ci

FROM --platform=$BUILDPLATFORM node:20.12.2-bookworm@sha256:a7ff24fb730330f24ecf5a485e13e2e92682a115a56a16cade83102f14cbe01c AS builder
ARG NODE_ENV=development
WORKDIR /app
RUN npm config set cache /.npm
COPY ./.husky/install.mjs ./.husky/
COPY ./build.js ./
COPY ./package*.json ./
RUN --mount=type=cache,id=npm-$TARGETPLATFORM,target=/.npm \
    npm ci
COPY ./src/ ./src/
RUN npm run build

FROM --platform=$BUILDPLATFORM node:20.12.2-bookworm@sha256:a7ff24fb730330f24ecf5a485e13e2e92682a115a56a16cade83102f14cbe01c AS dictionary
WORKDIR /app
RUN wget https://github.com/jpreprocess/jpreprocess/releases/download/v0.8.1/naist-jdic-jpreprocess.tar.gz \
    && tar xzf naist-jdic-jpreprocess.tar.gz \
    && rm naist-jdic-jpreprocess.tar.gz

FROM --platform=$BUILDPLATFORM node:20.12.2-bookworm@sha256:a7ff24fb730330f24ecf5a485e13e2e92682a115a56a16cade83102f14cbe01c AS models
WORKDIR /app
RUN git clone --depth 1 https://github.com/icn-lab/htsvoice-tohoku-f01.git

FROM --platform=$BUILDPLATFORM node:20.12.2-bookworm@sha256:a7ff24fb730330f24ecf5a485e13e2e92682a115a56a16cade83102f14cbe01c AS user-dictionary
WORKDIR /app
RUN wget https://github.com/jpreprocess/jpreprocess/releases/download/v0.8.1/x86_64-unknown-linux-gnu-.zip \
    && unzip x86_64-unknown-linux-gnu-.zip \
    && rm x86_64-unknown-linux-gnu-.zip
COPY ./data/dict.csv ./
RUN ./dict_tools build -u lindera dict.csv user-dictionary.bin

FROM gcr.io/distroless/nodejs20-debian12:nonroot@sha256:370f5779aa7dbe05b46741f2b1e5ff4bc760734b74c7df1c93eaf790d8bd51d4 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY ./package.json ./
COPY --from=builder /app/dist/ ./dist/
COPY --from=deps /app/node_modules/ ./node_modules/
COPY --from=dictionary /app/ ./dictionary/
ENV DICTIONARY=dictionary/naist-jdic
COPY --from=models /app/ ./models/
ENV MODELS=models/htsvoice-tohoku-f01/tohoku-f01-neutral.htsvoice
COPY --from=user-dictionary /app/ ./user-dictionary/
ENV USER_DICTIONARY=user-dictionary/user-dictionary.bin

CMD ["dist/main.js"]
