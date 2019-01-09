FROM mhart/alpine-node:11.2.0
ENV NODE_ENV production

WORKDIR /app/bake
COPY package.json .
COPY node_modules ./node_modules
COPY dist ./dist

RUN npm link

#setup placeholder paths for config/package
RUN mkdir config
RUN mkdir package

CMD [ "bake", "serve", "/app/bake/package/bake.yaml" ]