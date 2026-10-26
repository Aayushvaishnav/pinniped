## Element Call fork (vendored in element-call/, built from the tree)
FROM node:24.13.1-alpine AS element-call
RUN npm install -g pnpm@10.33.0
WORKDIR /src
COPY element-call /src/element-call
COPY scripts/fork/element-call /src/scripts/fork/element-call
ENV NODE_OPTIONS=--max_old_space_size=8192
RUN --mount=type=cache,target=/root/.local/share/pnpm \
  node scripts/fork/element-call/build.mjs /element-call-dist


## Builder
FROM node:24.13.1-alpine AS builder

WORKDIR /src

COPY .npmrc package.json package-lock.json /src/
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . /src/
COPY --from=element-call /element-call-dist /src/node_modules/.cache/cinny-element-call-fork
ARG APP_COMMIT=unknown
ENV APP_COMMIT=$APP_COMMIT
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build


## App
# Unprivileged nginx: runs as uid 101 on port 8080, with its pid and temp files in /tmp.
FROM nginxinc/nginx-unprivileged:1.31.2-alpine

USER root
COPY --from=builder /src/dist /app
COPY --from=builder /src/docker-nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html
USER 101
