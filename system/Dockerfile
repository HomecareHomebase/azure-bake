FROM mhart/alpine-node:11.2.0
ENV NODE_ENV production


RUN set -x \
    && apk add --no-cache bash

WORKDIR /app/bake
COPY package.json .
COPY package-lock.json .
COPY dist ./dist

RUN npm install --only=production
RUN npm link

#setup placeholder paths for config/package
RUN mkdir config
RUN mkdir package

CMD [ "bake", "serve", "/app/bake/package/bake.yaml" ]