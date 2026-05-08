targetScope = 'resourceGroup'

@allowed([
  'dev'
  'staging'
  'prod'
])
param env string

param location string = resourceGroup().location
param containerImage string = 'plugohdev.azurecr.io/plugoh-api:dev'
param corsOrigin string = 'http://localhost:8081,http://localhost:19006'

var appName = 'plugoh-api-${env}'
var acrName = 'plugoh${env}'
var kvName = 'plugoh${env}'
var logWorkspaceName = 'plugoh-${env}-logs'
var appInsightsName = 'plugoh-${env}-ai'
var redisName = 'plugoh-${env}-redis'

module loganalytics './loganalytics.bicep' = {
  name: 'loganalytics-${env}'
  params: {
    location: location
    workspaceName: logWorkspaceName
  }
}

module appinsights './appinsights.bicep' = {
  name: 'appinsights-${env}'
  params: {
    location: location
    appInsightsName: appInsightsName
    workspaceResourceId: loganalytics.outputs.workspaceId
  }
}

module acr './acr.bicep' = {
  name: 'acr-${env}'
  params: {
    location: location
    acrName: acrName
  }
}

module redis './redis.bicep' = {
  name: 'redis-${env}'
  params: {
    location: location
    redisName: redisName
  }
}

module keyvault './keyvault.bicep' = {
  name: 'keyvault-${env}'
  params: {
    location: location
    keyVaultName: kvName
  }
}

module containerApp './containerapp.bicep' = {
  name: 'containerapp-${env}'
  params: {
    location: location
    appName: appName
    containerImage: containerImage
    corsOrigin: corsOrigin
    minReplicas: env == 'prod' ? 2 : 2
    maxReplicas: env == 'prod' ? 200 : 30
    appInsightsConnectionString: appinsights.outputs.connectionString
  }
}

module frontdoor './frontdoor.bicep' = {
  name: 'frontdoor-${env}'
  params: {
    location: location
    profileName: 'plugoh-${env}-fd'
    backendHostName: containerApp.outputs.fqdn
  }
}
