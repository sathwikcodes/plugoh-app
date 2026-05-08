param location string
param profileName string
param backendHostName string

resource profile 'Microsoft.Cdn/profiles@2024-02-01' = {
  name: profileName
  location: 'global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
}

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = {
  name: '${profile.name}/api'
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

resource afdOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  name: '${profile.name}/api-origin-group'
  properties: {
    healthProbeSettings: {
      probePath: '/healthz/live'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 30
    }
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
    }
  }
}

resource afdOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  name: '${profile.name}/${afdOriginGroup.name}/api-origin'
  properties: {
    hostName: backendHostName
    httpsPort: 443
    originHostHeader: backendHostName
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
  }
}

resource afdRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  name: '${profile.name}/${endpoint.name}/api-route'
  properties: {
    originGroup: {
      id: afdOriginGroup.id
    }
    supportedProtocols: [
      'Http'
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
    linkToDefaultDomain: 'Enabled'
  }
}

resource wafPolicy 'Microsoft.Network/frontdoorWebApplicationFirewallPolicies@2023-09-01' = {
  name: '${profileName}-waf'
  location: 'global'
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'DefaultRuleSet'
          ruleSetVersion: '2.1'
        }
      ]
    }
  }
}
