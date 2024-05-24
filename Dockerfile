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
COPY --link --from=deps /app/node_modules/ ./node_modules/
RUN JPREPROCESS_VERSION=$(node -e "console.log(require('@discordjs-japan/om-syrinx').JPREPROCESS_VERSION)") ;\
    wget "https://github.com/jpreprocess/jpreprocess/releases/download/v${JPREPROCESS_VERSION}/naist-jdic-jpreprocess.tar.gz" -O - | tar xzf -

FROM --platform=$BUILDPLATFORM node:20.13.1-bookworm@sha256:d6925dc84f8c0d1c1f8df4ea6a9a54e57d430241cb734b1b0c45ed6d26e8e9c0 AS models
WORKDIR /app
RUN git clone --depth 1 https://github.com/icn-lab/htsvoice-tohoku-f01.git

FROM --platform=$BUILDPLATFORM node:20.13.1-bookworm@sha256:d6925dc84f8c0d1c1f8df4ea6a9a54e57d430241cb734b1b0c45ed6d26e8e9c0 AS user-dictionary
WORKDIR /app
COPY --link --from=deps /app/node_modules/ ./node_modules/
RUN JPREPROCESS_VERSION=$(node -e "console.log(require('@discordjs-japan/om-syrinx').JPREPROCESS_VERSION)") ;\
    wget "https://github.com/jpreprocess/jpreprocess/releases/download/v${JPREPROCESS_VERSION}/jpreprocess-x86_64-unknown-linux-gnu.tgz" -O - | tar xzf -
COPY --link ./data/dict.csv ./
RUN ./jpreprocess/dict_tools build -u lindera dict.csv user-dictionary.bin

FROM gcr.io/distroless/nodejs20-debian12:nonroot@sha256:cb85e5ffcb65cca33b8bc653edbb036e6818e20e050ce0623262a2d702ba199d AS runner
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
