FROM mhart/alpine-node:11.2.0
ENV NODE_ENV production

#setup Azure CLI
RUN set -x \
        && apk add --no-cache python \
                              curl \
                              openssl \
                              jq \
                              bash \
                              py-pip \
        && apk add --virtual=build \
                             gcc \
                             libffi-dev \
                             musl-dev \
                             libxml2-dev \
                             libxslt-dev \    
                             linux-headers \   
                             gcc \    
                             libffi \                        
                             openssl-dev \
                             python-dev \  
                             make \ 
        && pip install --upgrade pip \
        && pip install setuptools \
        && pip install azure-cli \    
        && apk del --purge build

WORKDIR /app/bake
COPY package.json .
COPY node_modules ./node_modules
COPY dist ./dist

#setup placeholder paths for config/package
RUN mkdir config
RUN mkdir package

CMD [ "npm", "start", "--", "-f", "/app/bake/package/bake.yaml" ]