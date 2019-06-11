FROM node:10

# Configure apt
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
   && apt-get -y install --no-install-recommends apt-utils 2>&1

##Install dependencies
RUN npm install -g eslint typescript lerna

# Verify git and process tools are installed
RUN apt-get install -y curl \
    git \
    procps \
    apt-transport-https \
    ca-certificates \    
    gnupg2 \
    software-properties-common

#Add Docker Key
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add -

#Add Docker Repository
RUN add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/debian \
   $(lsb_release -cs) \
   stable"

#Install Docker
RUN apt-get update \
   && apt-get install -y docker-ce docker-ce-cli containerd.io

# Clean up
RUN apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*
ENV DEBIAN_FRONTEND=dialog

# Set the default shell to bash rather than sh
ENV SHELL /bin/bash