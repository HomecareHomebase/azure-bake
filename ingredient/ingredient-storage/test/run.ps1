#Determine if environment varibles for bake are set
if ([string]::IsNullOrEmpty($ENV:BAKE_AUTH_SUBSCRIPTION_ID)) 
{
    [Environment]::SetEnvironmentVariable('BAKE_AUTH_SUBSCRIPTION_ID', $(Read-Host "Enter the Azure Subscription ID"))
    $global:BAKE_AUTH_SUBSCRIPTION_ID = $ENV:BAKE_AUTH_SUBSCRIPTION_ID
}
else { Write-Host "Azure Subscription ID is already set!" }

if ([string]::IsNullOrEmpty($ENV:BAKE_AUTH_TENANT_ID)) 
{
    [Environment]::SetEnvironmentVariable('BAKE_AUTH_TENANT_ID', $(Read-Host "Enter the Azure Tenant ID"))
    $global:BAKE_AUTH_TENANT_ID = $ENV:BAKE_AUTH_TENANT_ID
}
else { Write-Host "Azure Tenant ID is already set!" }

if ([string]::IsNullOrEmpty($ENV:BAKE_AUTH_SERVICE_ID)) 
{
    [Environment]::SetEnvironmentVariable('BAKE_AUTH_SERVICE_ID', $(Read-Host "Enter the Azure Service Principal ID"))
    $global:BAKE_AUTH_SERVICE_ID = $ENV:BAKE_AUTH_SERVICE_ID
}
else { Write-Host "Azure Service Principal ID is already set!" }

if ([string]::IsNullOrEmpty($ENV:BAKE_AUTH_SERVICE_KEY)) 
{
    [Environment]::SetEnvironmentVariable('BAKE_AUTH_SERVICE_KEY', $(Read-Host "Enter the Azure Service Principal Key"))
    $global:BAKE_AUTH_SERVICE_KEY = $ENV:BAKE_AUTH_SERVICE_KEY
}
else { Write-Host "Azure Service Principal Key is already set!" }

if ([string]::IsNullOrEmpty($ENV:CONTAINER_URI)) 
{
    [Environment]::SetEnvironmentVariable('CONTAINER_URI', $(Read-Host "Enter container repostiory URL"))
    $global:CONTAINER_URI = $ENV:CONTAINER_URI
}
else { Write-Host "Container Repository URL is already set!" }

$global:git_repo = $(git config --get remote.origin.url)
$global:git_branch = $(git rev-parse --abbrev-ref HEAD)

node ../../system/dist/index.js mix --name "storage-test:latest" --runtime "latest" test.yaml

#Run and push the container
if (![string]::IsNullOrEmpty($ENV:CONTAINER_URI)) 
{ 
    docker tag storage-test "$ENV:CONTAINER_URI/storage-test" 
    docker push "$ENV:CONTAINER_URI/storage-test:latest" 
}
