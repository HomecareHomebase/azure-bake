import { Subnet } from '@azure/arm-network/esm/models'

export class VnetData {
    value!: Value;
}

export class Value {
    virtualNetworkName!: string;
    virtualNetworkId!: string;
    subnetName!: string;
    virtualNetworkAddressPrefix!: string;
    virtualNetworkResourceGroupName!: string;
    location!: string;
    subscriptionId!: string;
    subnetProperties!: Subnet;
    subnetNeedsUpdate!: boolean;
    isNewVnet!: boolean;
    usePrivateDnsZone!: boolean;
    isNewPrivateDnsZone!: boolean;
    privateDnsResourceGroup!: string;
    privateDnsSubscriptionId!: string;
    privateDnsZoneName!: string;
    linkVirtualNetwork!: boolean;
    Network!: Network;
}

export class Network {
    DelegatedSubnetResourceId!: string;
    PrivateDnsZoneArmResourceId!: string;
}


