# syntax=docker/dockerfile:1.9.0@sha256:fe40cf4e92cd0c467be2cfc30657a680ae2398318afd50b0c80585784c604f28

FROM node:20.14.0-bookworm@sha256:02cd2205818f121c13612721876f28c18bd50148bb8af532ea121c96ffcb59bf AS deps
ARG NODE_ENV=production
WORKDIR /app
RUN npm config set cache /.npm
COPY --link ./.husky/install.mjs ./.husky/
COPY --link ./package*.json ./
ARG TARGETPLATFORM
RUN --mount=type=cache,id=npm-$TARGETPLATFORM,target=/.npm \
    npm ci
RUN node -e "console.log(require('@discordjs-japan/om-syrinx').JPREPROCESS_VERSION)" > .jpreprocess-version

FROM --platform=$BUILDPLATFORM node:20.14.0-bookworm@sha256:02cd2205818f121c13612721876f28c18bd50148bb8af532ea121c96ffcb59bf AS builder
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

FROM --platform=$BUILDPLATFORM node:20.14.0-bookworm@sha256:02cd2205818f121c13612721876f28c18bd50148bb8af532ea121c96ffcb59bf AS dictionary
WORKDIR /app
COPY --link --from=deps /app/.jpreprocess-version ./
RUN curl -L "https://github.com/jpreprocess/jpreprocess/releases/download/v$(cat .jpreprocess-version)/naist-jdic-jpreprocess.tar.gz" | tar xzf -

FROM --platform=$BUILDPLATFORM node:20.14.0-bookworm@sha256:02cd2205818f121c13612721876f28c18bd50148bb8af532ea121c96ffcb59bf AS models
WORKDIR /app
RUN curl -L "https://github.com/icn-lab/htsvoice-tohoku-f01/archive/refs/heads/master.tar.gz" | tar xzf -

FROM --platform=$BUILDPLATFORM node:20.14.0-bookworm@sha256:02cd2205818f121c13612721876f28c18bd50148bb8af532ea121c96ffcb59bf AS user-dictionary
WORKDIR /app
COPY --link --from=deps /app/.jpreprocess-version ./
RUN curl -L "https://github.com/jpreprocess/jpreprocess/releases/download/v$(cat .jpreprocess-version)/jpreprocess-$(uname -m)-unknown-linux-gnu.tgz" | tar xzf -
COPY --link ./data/dict.csv ./
RUN ./jpreprocess/dict_tools build -u lindera dict.csv user-dictionary.bin

FROM gcr.io/distroless/nodejs20-debian12:nonroot@sha256:8fb7503c80e771e2dbdedc35c29c9bec90c0bdda4430f7549e0e10897064bb02 AS runner
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
