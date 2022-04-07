export interface VnetData {
    value: Value;
}

export interface Value {
    isLoading:                       boolean;
    virtualNetworkName:              string;
    virtualNetworkId:                string;
    subnetName:                      string;
    virtualNetworkSubscriptionName:  string;
    virtualNetworkAddressPrefix:     string;
    virtualNetworkResourceGroupName: string;
    location:                        string;
    subscriptionId:                  string;
    subnetProperties:                SubnetProperties;
    subnetNeedsUpdate:               boolean;
    isNewVnet:                       boolean;
    delegatedSubnetArguments:        DelegatedSubnetArguments;
    usePrivateDnsZone:               boolean;
    isNewPrivateDnsZone:             boolean;
    privateDnsResourceGroup:         string;
    privateDnsSubscriptionId:        string;
    privateDnsZoneName:              string;
    privateDnsZoneSubscription:      string;
    privateDnsZoneArguments:         PrivateDNSZoneArguments;
    linkVirtualNetwork:              boolean;
    Network:                         Network;
}

export interface Network {
    DelegatedSubnetResourceId:   string;
    PrivateDnsZoneResourceId:    string;
    PrivateDnsZoneArmResourceId: string;
}

export interface DelegatedSubnetArguments {
    SubnetArmResourceId: string;
}

export interface PrivateDNSZoneArguments {
    PrivateDnsZoneArmResourceId: string;
}

export interface SubnetProperties {
    provisioningState:                 string;
    addressPrefix:                     string;
    routeTable:                        RouteTable;
    serviceEndpoints:                  any[];
    delegations:                       Delegation[];
    privateEndpointNetworkPolicies:    string;
    privateLinkServiceNetworkPolicies: string;
}

export interface Delegation {
    name:       string;
    properties: Properties;
}

export interface Properties {
    serviceName: string;
}

export interface RouteTable {
    id: string;
}
