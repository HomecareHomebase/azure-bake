FROM node:10

# Configure apt
ENV DEBIAN_FRONTEND=noninteractive

#Suppress an apt-key warning about standard out not being a terminal. Use in this script is safe.
ENV APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn

#Update and  install apt utils
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
    gnupg \    
    gnupg2 \
    software-properties-common    

#Install KubeCTL
RUN apt-get update \
      && curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \
      && echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" | tee -a /etc/apt/sources.list.d/kubernetes.list \
      && apt-get update \
      && apt-get install -y kubectl

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

#Install Powershell
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
   && add-apt-repository "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-debian-stretch-prod stretch main" \
   && apt-get update \
   && apt-get install -y powershell \
   && pwsh

# Clean up
RUN apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*
ENV DEBIAN_FRONTEND=dialog

# Set the default shell to bash rather than sh
ENV SHELL /bin/bash