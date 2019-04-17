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

node ../../system/dist/index.js serve test.yaml