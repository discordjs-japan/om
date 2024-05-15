# syntax=docker/dockerfile:1@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

FROM node:20.13.1-bookworm@sha256:d6925dc84f8c0d1c1f8df4ea6a9a54e57d430241cb734b1b0c45ed6d26e8e9c0 AS deps
ARG NODE_ENV=production
WORKDIR /app
RUN npm config set cache /.npm
COPY --link ./.husky/install.mjs ./.husky/
COPY --link ./package*.json ./
RUN --mount=type=cache,id=npm-$TARGETPLATFORM,target=/.npm \
    npm ci

FROM --platform=$BUILDPLATFORM node:20.13.1-bookworm@sha256:d6925dc84f8c0d1c1f8df4ea6a9a54e57d430241cb734b1b0c45ed6d26e8e9c0 AS builder
ARG NODE_ENV=development
WORKDIR /app
RUN npm config set cache /.npm
COPY --link ./.husky/install.mjs ./.husky/
COPY --link ./build.js ./
COPY --link ./package*.json ./
RUN --mount=type=cache,id=npm-$TARGETPLATFORM,target=/.npm \
    npm ci
COPY --link ./src/ ./src/
RUN npm run build

FROM --platform=$BUILDPLATFORM node:20.13.1-bookworm@sha256:d6925dc84f8c0d1c1f8df4ea6a9a54e57d430241cb734b1b0c45ed6d26e8e9c0 AS dictionary
WORKDIR /app
RUN wget https://github.com/jpreprocess/jpreprocess/releases/download/v0.8.1/naist-jdic-jpreprocess.tar.gz \
    && tar xzf naist-jdic-jpreprocess.tar.gz \
    && rm naist-jdic-jpreprocess.tar.gz

FROM --platform=$BUILDPLATFORM node:20.13.1-bookworm@sha256:d6925dc84f8c0d1c1f8df4ea6a9a54e57d430241cb734b1b0c45ed6d26e8e9c0 AS models
WORKDIR /app
RUN git clone --depth 1 https://github.com/icn-lab/htsvoice-tohoku-f01.git

FROM --platform=$BUILDPLATFORM node:20.13.1-bookworm@sha256:d6925dc84f8c0d1c1f8df4ea6a9a54e57d430241cb734b1b0c45ed6d26e8e9c0 AS user-dictionary
WORKDIR /app
RUN wget https://github.com/jpreprocess/jpreprocess/releases/download/v0.8.1/x86_64-unknown-linux-gnu-.zip \
    && unzip x86_64-unknown-linux-gnu-.zip \
    && rm x86_64-unknown-linux-gnu-.zip
COPY --link ./data/dict.csv ./
RUN ./dict_tools build -u lindera dict.csv user-dictionary.bin

FROM gcr.io/distroless/nodejs20-debian12:nonroot@sha256:98633486db2f72dc5b00dc645667654ad450f79a4f10f8a482644447335b8023 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --link ./package.json ./
COPY --link --from=builder /app/dist/ ./dist/
COPY --link --from=deps /app/node_modules/ ./node_modules/
COPY --link --from=dictionary /app/ ./dictionary/
ENV DICTIONARY=dictionary/naist-jdic
COPY --link --from=models /app/ ./models/
ENV MODELS=models/htsvoice-tohoku-f01/tohoku-f01-neutral.htsvoice
COPY --link --from=user-dictionary /app/ ./user-dictionary/
ENV USER_DICTIONARY=user-dictionary/user-dictionary.bin

CMD ["dist/main.js"]
