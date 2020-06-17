FROM mhart/alpine-node:11.2.0
ENV NODE_ENV production

# Install kubectl
# Note: Latest version may be found on:
# https://aur.archlinux.org/packages/kubectl-bin/
ADD https://storage.googleapis.com/kubernetes-release/release/v1.15.6/bin/linux/amd64/kubectl /usr/local/bin/kubectl

RUN set -x \
    && apk add --no-cache bash \
    && apk add --no-cache curl ca-certificates \
    && chmod +x /usr/local/bin/kubectl

WORKDIR /app/bake
COPY package.json .
COPY package-lock.json .
COPY dist ./dist

RUN npm install --only=production
RUN npm link

#setup placeholder paths for config/package
RUN mkdir config
RUN mkdir package
RUN touch /app/bake/.env

CMD [ "bake", "serve", "/app/bake/package/bake.yaml" ]