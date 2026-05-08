param location string
param redisName string

resource redis 'Microsoft.Cache/Redis@2023-08-01' = {
  name: redisName
  location: location
  properties: {
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    redisConfiguration: {}
  }
  sku: {
    name: 'Standard'
    family: 'C'
    capacity: 1
  }
}

output redisHost string = redis.properties.hostName
