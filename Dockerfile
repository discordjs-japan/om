# syntax=docker/dockerfile:1@sha256:ac85f380a63b13dfcefa89046420e1781752bab202122f8f50032edf31be0021

FROM buildpack-deps:bookworm AS model-fetch
WORKDIR /app
RUN wget https://github.com/jpreprocess/jpreprocess/releases/download/v0.6.1/naist-jdic-jpreprocess.tar.gz \
    && tar xzf naist-jdic-jpreprocess.tar.gz \
    && rm naist-jdic-jpreprocess.tar.gz
RUN git clone --depth 1 https://github.com/icn-lab/htsvoice-tohoku-f01.git

FROM ghcr.io/jqlang/jq:1.7 as fetch-jq

FROM quay.io/curl/curl-base:8.4.0 as fetch-pnpm
ENV SHELL="sh"
ENV ENV="/tmp/env"
ENV PNPM_HOME="/pnpm"
WORKDIR /dist
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,from=fetch-jq,source=/jq,target=/mounted-bin/jq \
    curl -fsSL --compressed https://get.pnpm.io/install.sh | env PNPM_VERSION=$(cat package.json  | /mounted-bin/jq -r .packageManager | grep -oE '[0-9]+\.[0-9]+\.[0-9]+') sh -

FROM buildpack-deps:bookworm as fetch-deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /package
COPY --link --from=fetch-pnpm /pnpm/ /pnpm/
RUN pnpm config set store-dir /.pnpm-store
COPY --link .npmrc .node-version ./
RUN echo "use-node-version=`cat .node-version`" >> .npmrc
RUN --mount=type=cache,target=/.pnpm-store \
# package.json: for simple-git-hooks 
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    pnpm fetch
COPY --link package.json ./

FROM fetch-deps as dev-deps
RUN --mount=type=cache,target=/.pnpm-store \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    pnpm install --frozen-lockfile --offline

FROM buildpack-deps:bookworm as builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN --mount=type=bind,from=fetch-deps,source=/pnpm/,target=/pnpm/ \
    --mount=type=bind,from=dev-deps,source=/package/node_modules/,target=node_modules/ \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=.npmrc,target=.npmrc \
    --mount=type=bind,source=build.js,target=build.js \
    --mount=type=bind,source=src/,target=src/ \
    pnpm build

FROM fetch-deps as prod-deps
ARG NODE_ENV="production"
RUN --mount=type=cache,target=/.pnpm-store \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    pnpm install --frozen-lockfile --offline

FROM gcr.io/distroless/cc-debian12:nonroot as runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV="production"
WORKDIR /app
COPY --link --from=model-fetch /app/ ./model/
COPY --link --from=fetch-deps /pnpm/ /pnpm/
COPY --link --from=builder /app/dist/ ./dist/
COPY --from=prod-deps /package/node_modules/ ./node_modules/
COPY --link .npmrc package.json ./
ENTRYPOINT [ "pnpm", "--shell-emulator" ]
CMD [ "start" ]
