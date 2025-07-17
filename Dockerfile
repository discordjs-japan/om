# syntax=docker/dockerfile:1.17.1@sha256:38387523653efa0039f8e1c89bb74a30504e76ee9f565e25c9a09841f9427b05

FROM node:22.17.1-bookworm@sha256:9e6918e8e32a47a58ed5fb9bd235bbc1d18a8c272e37f15d502b9db9e36821ee AS deps
ARG NODE_ENV=production
WORKDIR /app
RUN npm config set cache /.npm
COPY --link ./.husky/install.mjs ./.husky/
COPY --link ./package*.json ./
ARG TARGETPLATFORM
RUN --mount=type=cache,id=npm-$TARGETPLATFORM,target=/.npm \
    npm ci
RUN node --print "require('@discordjs-japan/om-syrinx').JPREPROCESS_VERSION" > .jpreprocess-version

FROM --platform=$BUILDPLATFORM node:22.17.1-bookworm@sha256:9e6918e8e32a47a58ed5fb9bd235bbc1d18a8c272e37f15d502b9db9e36821ee AS builder
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

FROM --platform=$BUILDPLATFORM node:22.17.1-bookworm@sha256:9e6918e8e32a47a58ed5fb9bd235bbc1d18a8c272e37f15d502b9db9e36821ee AS dictionary
WORKDIR /app
COPY --link --from=deps /app/.jpreprocess-version ./
RUN curl -L "https://github.com/jpreprocess/jpreprocess/releases/download/v$(cat .jpreprocess-version)/naist-jdic-jpreprocess.tar.gz" | tar xzf -

FROM --platform=$BUILDPLATFORM node:22.17.1-bookworm@sha256:9e6918e8e32a47a58ed5fb9bd235bbc1d18a8c272e37f15d502b9db9e36821ee AS models
WORKDIR /app
RUN curl -L "https://github.com/icn-lab/htsvoice-tohoku-f01/archive/refs/heads/master.tar.gz" | tar xzf -

FROM --platform=$BUILDPLATFORM node:22.17.1-bookworm@sha256:9e6918e8e32a47a58ed5fb9bd235bbc1d18a8c272e37f15d502b9db9e36821ee AS user-dictionary
WORKDIR /app
COPY --link --from=deps /app/.jpreprocess-version ./
RUN curl -L "https://github.com/jpreprocess/jpreprocess/releases/download/v$(cat .jpreprocess-version)/jpreprocess-$(uname -m)-unknown-linux-gnu.tgz" | tar xzf -
COPY --link ./data/dict.csv ./
RUN ./jpreprocess/dict_tools build -u lindera dict.csv user-dictionary.bin

FROM gcr.io/distroless/nodejs22-debian12:nonroot@sha256:8d8b9363b0c9d1153f845824f9b754fdb050ada4fa190583eca2da13fdd3138c AS runner
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
