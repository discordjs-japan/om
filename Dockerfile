# syntax=docker/dockerfile:1.11.1@sha256:10c699f1b6c8bdc8f6b4ce8974855dd8542f1768c26eb240237b8f1c9c6c9976

FROM node:22.11.0-bookworm@sha256:5c76d05034644fa8ecc9c2aa84e0a83cd981d0ef13af5455b87b9adf5b216561 AS deps
ARG NODE_ENV=production
WORKDIR /app
RUN npm config set cache /.npm
COPY --link ./.husky/install.mjs ./.husky/
COPY --link ./package*.json ./
ARG TARGETPLATFORM
RUN --mount=type=cache,id=npm-$TARGETPLATFORM,target=/.npm \
    npm ci
RUN node -e "console.log(require('@discordjs-japan/om-syrinx').JPREPROCESS_VERSION)" > .jpreprocess-version

FROM --platform=$BUILDPLATFORM node:22.11.0-bookworm@sha256:5c76d05034644fa8ecc9c2aa84e0a83cd981d0ef13af5455b87b9adf5b216561 AS builder
ARG NODE_ENV=development
WORKDIR /app
RUN npm config set cache /.npm
COPY --link ./.husky/install.mjs ./.husky/
COPY --link ./build.js ./
COPY --link ./package*.json ./
ARG BUILDPLATFORM
RUN --mount=type=cache,id=npm-$BUILDPLATFORM,target=/.npm \
    npm ci
COPY --link ./src/ ./src/
RUN npm run build

FROM --platform=$BUILDPLATFORM node:22.11.0-bookworm@sha256:5c76d05034644fa8ecc9c2aa84e0a83cd981d0ef13af5455b87b9adf5b216561 AS dictionary
WORKDIR /app
COPY --link --from=deps /app/.jpreprocess-version ./
RUN curl -L "https://github.com/jpreprocess/jpreprocess/releases/download/v$(cat .jpreprocess-version)/naist-jdic-jpreprocess.tar.gz" | tar xzf -

FROM --platform=$BUILDPLATFORM node:22.11.0-bookworm@sha256:5c76d05034644fa8ecc9c2aa84e0a83cd981d0ef13af5455b87b9adf5b216561 AS models
WORKDIR /app
RUN curl -L "https://github.com/icn-lab/htsvoice-tohoku-f01/archive/refs/heads/master.tar.gz" | tar xzf -

FROM --platform=$BUILDPLATFORM node:22.11.0-bookworm@sha256:5c76d05034644fa8ecc9c2aa84e0a83cd981d0ef13af5455b87b9adf5b216561 AS user-dictionary
WORKDIR /app
COPY --link --from=deps /app/.jpreprocess-version ./
RUN curl -L "https://github.com/jpreprocess/jpreprocess/releases/download/v$(cat .jpreprocess-version)/jpreprocess-$(uname -m)-unknown-linux-gnu.tgz" | tar xzf -
COPY --link ./data/dict.csv ./
RUN ./jpreprocess/dict_tools build -u lindera dict.csv user-dictionary.bin

FROM gcr.io/distroless/nodejs22-debian12:nonroot@sha256:de286271ef771e563194702ff49cc5d60e7ea59a09349cdae129e3b0c6ab396b AS runner
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

CMD ["dist/main.js"]
