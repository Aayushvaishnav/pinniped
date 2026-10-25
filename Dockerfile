## Element Call fork (upstream tag + scripts/fork/element-call patches)
FROM node:24.13.1-alpine AS element-call
RUN apk add --no-cache git && npm install -g pnpm@10.33.0
WORKDIR /src
COPY scripts/fork/element-call /src/scripts/fork/element-call
ENV NODE_OPTIONS=--max_old_space_size=8192
RUN node scripts/fork/element-call/build.mjs /element-call-dist


## Builder
FROM node:24.13.1-alpine AS builder

WORKDIR /src

COPY .npmrc package.json package-lock.json /src/
RUN npm ci
COPY . /src/
COPY --from=element-call /element-call-dist /src/node_modules/.cache/cinny-element-call-fork
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build


## App
FROM nginx:1.31.2-alpine

COPY --from=builder /src/dist /app
COPY --from=builder /src/docker-nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html
