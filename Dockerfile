FROM myrotvorets/node-build:latest@sha256:e5ba62c006f68aef42a97c538bae7e17159eb91deec0e270aec4fd9b96807983 AS build
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

FROM myrotvorets/node-min@sha256:a9844f66d8ce3569ad7b101ee94bf3dde1035e815d3a49cf0e036171c2503e5f
USER root
WORKDIR /srv/service
RUN chown nobody:nobody /srv/service && apk add --no-cache vips
USER nobody:nobody
ENTRYPOINT ["/usr/bin/node", "index.mjs"]
COPY --chown=nobody:nobody --from=build /srv/service/node_modules ./node_modules
COPY --chown=nobody:nobody ./src/specs ./specs
COPY --chown=nobody:nobody --from=build /srv/service/dist/ ./
COPY --chown=nobody:nobody ./package.json ./
