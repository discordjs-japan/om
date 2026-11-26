# syntax=docker/dockerfile:1.29.0@sha256:572cebbc2b15e6f84c077742952674889cb63cd5e9b80abdffcbe587b6f19183

FROM node:26.13.1-bookworm@sha256:b7087bc4d973034b30854b378ba107f9fab622b47514cb7e2592e41b8bab8d49 AS deps
ARG NODE_ENV=production
WORKDIR /work
RUN npm config set cache /.npm
COPY --link ./.husky/install.mjs ./.husky/
COPY --link ./package.json ./package-lock.json ./
ARG TARGETPLATFORM
RUN --mount=type=cache,id=npm-$TARGETPLATFORM,target=/.npm \
    npm ci
RUN node --print "require('@discordjs-japan/om-syrinx').JPREPROCESS_VERSION" > .jpreprocess-version

FROM --platform=$BUILDPLATFORM node:26.13.1-bookworm@sha256:b7087bc4d973034b30854b378ba107f9fab622b47514cb7e2592e41b8bab8d49 AS describe
WORKDIR /work
RUN --mount=type=bind,source=.,target=.,readwrite <<'EOF'
#!/bin/bash
set -o errexit -o nounset -o xtrace -o pipefail

if [ "$(git rev-parse --is-shallow-repository)" = true ]; then
  git fetch --unshallow --filter=tree:0 --quiet || true
fi

mkdir -p /out
npm run --silent version:git-describe > /out/git-describe
EOF

FROM --platform=$BUILDPLATFORM node:26.13.1-bookworm@sha256:b7087bc4d973034b30854b378ba107f9fab622b47514cb7e2592e41b8bab8d49 AS builder
ARG NODE_ENV=development
WORKDIR /work
RUN npm config set cache /.npm
COPY --link ./.husky/install.mjs ./.husky/
COPY --link ./rolldown.config.mts ./
COPY --link ./package.json ./package-lock.json ./
ARG BUILDPLATFORM
RUN --mount=type=cache,id=npm-$BUILDPLATFORM,target=/.npm \
    npm ci
COPY --link ./src/ ./src/
RUN --mount=type=bind,from=describe,source=/out/git-describe,target=/tmp/git-describe \
    npm run build -- --environment="OM_VERSION:$(cat /tmp/git-describe)"

FROM --platform=$BUILDPLATFORM node:26.13.1-bookworm@sha256:b7087bc4d973034b30854b378ba107f9fab622b47514cb7e2592e41b8bab8d49 AS dictionary
WORKDIR /work
COPY --link --from=deps /work/.jpreprocess-version ./
RUN curl -L "https://github.com/jpreprocess/jpreprocess/releases/download/v$(cat .jpreprocess-version)/naist-jdic-jpreprocess.tar.gz" | tar xzf -

FROM --platform=$BUILDPLATFORM node:26.13.1-bookworm@sha256:b7087bc4d973034b30854b378ba107f9fab622b47514cb7e2592e41b8bab8d49 AS models
WORKDIR /work
RUN curl -L "https://github.com/icn-lab/htsvoice-tohoku-f01/archive/refs/heads/master.tar.gz" | tar xzf -

FROM --platform=$BUILDPLATFORM node:26.13.1-bookworm@sha256:b7087bc4d973034b30854b378ba107f9fab622b47514cb7e2592e41b8bab8d49 AS user-dictionary
WORKDIR /work
COPY --link --from=deps /work/.jpreprocess-version ./
RUN curl -L "https://github.com/jpreprocess/jpreprocess/releases/download/v$(cat .jpreprocess-version)/jpreprocess-$(uname -m)-unknown-linux-gnu.tgz" | tar xzf -
COPY --link ./data/dict.csv ./
RUN ./jpreprocess/dict_tools build -u lindera dict.csv user-dictionary.bin

FROM gcr.io/distroless/nodejs26-debian13:nonroot@sha256:ffa8a7545403036c94ec76674b5dbac2d425af2d679147cdf3e30180071487b7 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --link ./package.json ./
COPY --link --from=builder /work/dist/ ./dist/
COPY --link --from=deps /work/node_modules/ ./node_modules/
COPY --link --from=dictionary /work/ ./dictionary/
ENV DICTIONARY=dictionary/naist-jdic
COPY --link --from=models /work/ ./models/
ENV MODELS=models/htsvoice-tohoku-f01-master/tohoku-f01-neutral.htsvoice
COPY --link --from=user-dictionary /work/ ./user-dictionary/
ENV USER_DICTIONARY=user-dictionary/user-dictionary.bin

CMD ["--enable-source-maps", "dist/main.js"]
