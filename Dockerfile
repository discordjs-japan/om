# syntax=docker/dockerfile:1@sha256:ac85f380a63b13dfcefa89046420e1781752bab202122f8f50032edf31be0021

# ビルド時に基礎として使うイメージを定義
FROM buildpack-deps:bookworm as base-build
ENV SHELL="sh"
ENV ENV="/tmp/env"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# jqのバイナリを取得する => /jq
FROM ghcr.io/jqlang/jq:1.7 as fetch-jq

# 音声モデルを取得する => /app/
FROM --platform=$BUILDPLATFORM base-build AS model-fetch
WORKDIR /app
RUN wget https://github.com/jpreprocess/jpreprocess/releases/download/v0.6.1/naist-jdic-jpreprocess.tar.gz \
    && tar xzf naist-jdic-jpreprocess.tar.gz \
    && rm naist-jdic-jpreprocess.tar.gz
RUN git clone --depth 1 https://github.com/icn-lab/htsvoice-tohoku-f01.git

FROM base-build as deps
WORKDIR /app
COPY --link --from=fetch-jq /jq ./
COPY --link package.json ./
RUN curl -fsSL --compressed https://get.pnpm.io/install.sh | env PNPM_VERSION=$(cat package.json  | ./jq -r .packageManager | grep -oE '[0-9]+\.[0-9]+\.[0-9]+') sh -
COPY --link .npmrc .node-version ./
RUN echo "store-dir=/.pnpm-store" >> .npmrc &&\
    echo "use-node-version=`cat .node-version`" >> .npmrc
COPY --link pnpm-lock.yaml ./
ARG NODE_ENV="production"
RUN pnpm install --frozen-lockfile

# ビルドする => /app/dist/
FROM --platform=$BUILDPLATFORM deps as builder
ARG NODE_ENV=""
RUN pnpm install --frozen-lockfile
COPY --link build.js ./
COPY --link  src/ ./src/
RUN pnpm build

FROM gcr.io/distroless/cc-debian12:nonroot as runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV="production"
WORKDIR /app
COPY --link --from=model-fetch /app/ ./model/
COPY --link --from=deps /app/.npmrc ./
COPY --link --from=deps /pnpm/ /pnpm/
COPY --link --from=builder /app/dist/ ./dist/
COPY --from=deps /app/node_modules/ ./node_modules/
COPY --link package.json ./
ENTRYPOINT [ "pnpm", "--shell-emulator" ]
CMD [ "start" ]
