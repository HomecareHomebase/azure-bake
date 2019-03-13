#!/bin/bash
if [[ -z "${BAKE_AUTH_SUBSCRIPTION_ID}" ]]
    then read -p 'Enter the Azure Subscription ID: ' sub_id
    export BAKE_AUTH_SUBSCRIPTION_ID="$BAKE_AUTH_SUBSCRIPTION_ID"
    else echo "Azure Subscription ID is already set!"
fi

if [[ -z "${BAKE_AUTH_TENANT_ID}" ]]
    then read -p "Enter the Azure Tenant ID: " tenant_id
    export BAKE_AUTH_TENANT_ID="$BAKE_AUTH_TENANT_ID"
    else echo "Azure Tenant ID is already set!"
fi

if [[ -z "${BAKE_AUTH_SERVICE_ID}" ]]
    then read -p "Enter the Azure Service ID: " svc_id 
    export BAKE_AUTH_SERVICE_ID="$BAKE_AUTH_SERVICE_ID"
    else echo "Azure Service ID is already set!"
fi

if [ -z "$BAKE_AUTH_SERVICE_KEY" ]
    then read -p "Enter the Azure Service Key: " svc_key 
    export BAKE_AUTH_SERVICE_KEY="$BAKE_AUTH_SERVICE_KEY"
    else echo "Azure Service Key is already set!"
fi

if [ -z "$CONTAINER_URI" ]
    then read -p "Enter container repostiory URL: " cont_uri 
    export CONTAINER_URI="$CONTAINER_URI"
    else echo "Container Repository URL is already set!"
fi

#Set environment variables as local for Dockerfile
$git_repo = "$BUILD_REPOSITORY_URI"
$git_branch = "$BUILD_SOURCEBRANCH"

node ../../system/dist/index.js serve "storage-test:latest"