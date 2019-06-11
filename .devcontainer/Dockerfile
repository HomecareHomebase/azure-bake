#-----------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root for license information.
#-----------------------------------------------------------------------------------------

FROM docker

# Configure apt
RUN apk update

# Verify git and process tools are installed
RUN apk add git procps nodejs typescript lerna npm

# Set the default shell to bash rather than sh
ENV SHELL /bin/sh