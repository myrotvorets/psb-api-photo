FROM myrotvorets/node-build:latest@sha256:ab5385ed9e640cfd6595288cb9fe38259bbbdea8e1800e92e6739aaa0bde7317 AS build
USER root
WORKDIR /srv/service
RUN chown nobody:nobody /srv/service && apk add --no-cache vips-dev
USER nobody:nobody
COPY --chown=nobody:nobody ./package.json ./package-lock.json ./tsconfig.json .npmrc* ./
RUN \
    npm ci --ignore-scripts --userconfig .npmrc.local && \
    rm -f .npmrc.local && \
    npm rebuild && \
    npm run prepare --if-present
COPY --chown=nobody:nobody ./src ./src
RUN npm run build -- --declaration false --removeComments true --sourceMap false
RUN npm prune --omit=dev

FROM myrotvorets/node-min@sha256:4031b955058ebf84e1c428ca37b74382b9dfcbdde63639558be946e7e7dca781
USER root
WORKDIR /srv/service
RUN chown nobody:nobody /srv/service && apk add --no-cache vips
USER nobody:nobody
ENTRYPOINT ["/usr/bin/node", "index.mjs"]
COPY --chown=nobody:nobody --from=build /srv/service/node_modules ./node_modules
COPY --chown=nobody:nobody ./src/specs ./specs
COPY --chown=nobody:nobody --from=build /srv/service/dist/ ./
COPY --chown=nobody:nobody ./package.json ./
