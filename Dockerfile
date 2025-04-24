# syntax=docker/dockerfile:1.15.0@sha256:05e0ad437efefcf144bfbf9d7f728c17818408e6d01432d9e264ef958bbd52f3

FROM node:22.15.0-bookworm@sha256:473b4362b26d05e157f8470a1f0686cab6a62d1bd2e59774079ddf6fecd8e37e AS deps
ARG NODE_ENV=production
WORKDIR /app
RUN npm config set cache /.npm
COPY --link ./.husky/install.mjs ./.husky/
COPY --link ./package*.json ./
ARG TARGETPLATFORM
RUN --mount=type=cache,id=npm-$TARGETPLATFORM,target=/.npm \
    npm ci
RUN node --print "require('@discordjs-japan/om-syrinx').JPREPROCESS_VERSION" > .jpreprocess-version

FROM --platform=$BUILDPLATFORM node:22.15.0-bookworm@sha256:473b4362b26d05e157f8470a1f0686cab6a62d1bd2e59774079ddf6fecd8e37e AS builder
ARG NODE_ENV=development
WORKDIR /app
RUN npm config set cache /.npm
COPY --link ./.husky/install.mjs ./.husky/
COPY --link ./scripts/build.js ./scripts/
COPY --link ./package*.json ./
ARG BUILDPLATFORM
RUN --mount=type=cache,id=npm-$BUILDPLATFORM,target=/.npm \
    npm ci
COPY --link ./src/ ./src/
RUN npm run build

FROM --platform=$BUILDPLATFORM node:22.15.0-bookworm@sha256:473b4362b26d05e157f8470a1f0686cab6a62d1bd2e59774079ddf6fecd8e37e AS dictionary
WORKDIR /app
COPY --link --from=deps /app/.jpreprocess-version ./
RUN curl -L "https://github.com/jpreprocess/jpreprocess/releases/download/v$(cat .jpreprocess-version)/naist-jdic-jpreprocess.tar.gz" | tar xzf -

FROM --platform=$BUILDPLATFORM node:22.15.0-bookworm@sha256:473b4362b26d05e157f8470a1f0686cab6a62d1bd2e59774079ddf6fecd8e37e AS models
WORKDIR /app
RUN curl -L "https://github.com/icn-lab/htsvoice-tohoku-f01/archive/refs/heads/master.tar.gz" | tar xzf -

FROM --platform=$BUILDPLATFORM node:22.15.0-bookworm@sha256:473b4362b26d05e157f8470a1f0686cab6a62d1bd2e59774079ddf6fecd8e37e AS user-dictionary
WORKDIR /app
COPY --link --from=deps /app/.jpreprocess-version ./
RUN curl -L "https://github.com/jpreprocess/jpreprocess/releases/download/v$(cat .jpreprocess-version)/jpreprocess-$(uname -m)-unknown-linux-gnu.tgz" | tar xzf -
COPY --link ./data/dict.csv ./
RUN ./jpreprocess/dict_tools build -u lindera dict.csv user-dictionary.bin

FROM gcr.io/distroless/nodejs22-debian12:nonroot@sha256:28a71222ea7ab7d16a2abb888484cf40d43d86e053069a624ddb371cc9efdec2 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --link ./package.json ./
COPY --link --from=builder /app/dist/ ./dist/
COPY --link --from=deps /app/node_modules/ ./node_modules/
COPY --link --from=dictionary /app/ ./dictionary/
ENV DICTIONARY=dictionary/naist-jdic
COPY --link --from=models /app/ ./models/
ENV MODELS=models/htsvoice-tohoku-f01-master/tohoku-f01-neutral.htsvoice
COPY --link --from=user-dictionary /app/ ./user-dictionary/
ENV USER_DICTIONARY=user-dictionary/user-dictionary.bin

CMD ["--enable-source-maps", "dist/main.js"]
