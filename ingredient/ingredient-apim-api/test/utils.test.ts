import { expect } from 'chai'
import 'mocha'

import {
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    Logger
} from '@azbake/core'

import { ApimApiUtils } from '../src/functions'

function createContext(shortName: string): DeploymentContext {
    const config: IBakeConfig = {
        name: 'test',
        shortName,
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map()
    }

    const env: IBakeEnvironment = {
        toolVersion: '0.0.0',
        environmentName: 'env',
        environmentCode: 'dev',
        regions: [{ name: 'Global', shortName: 'global', code: 'glob' }],
        authentication: {
            subscriptionId: 'sub',
            tenantId: 'tenant',
            serviceId: 'service',
            secretKey: 'secret',
            certPath: '',
            skipAuth: true
        },
        variables: new Map(),
        logLevel: 'info'
    }

    const pkg: IBakePackage = {
        Config: config,
        Environment: env,
        Authenticate: async () => true
    }

    const region: IBakeRegion = { name: 'Global', shortName: 'global', code: 'glob' }
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, region, new Logger())
}

describe('ApimApiUtils', () => {
    it('builds host header using shortName when serviceName missing', () => {
        const utils = new ApimApiUtils(createContext('short'))

        const hostHeader = utils.get_hostheader('ns', 'cluster.local')

        expect(hostHeader).to.equal('short-ns.cluster.local')
    })

    it('builds swagger URL using defaults', () => {
        const utils = new ApimApiUtils(createContext('svc'))

        const url = utils.get_swaggerUrl('apps', 'k8s.local', 'v1')

        expect(url).to.equal('https://svc-apps.k8s.local/swagger/v1/swagger.json')
    })

    it('builds swagger URL with overrides', () => {
        const utils = new ApimApiUtils(createContext('svc'))

        const url = utils.get_swaggerUrl('apps', 'k8s.local', 'v2', 'api', 'http')

        expect(url).to.equal('http://api-apps.k8s.local/swagger/v2/swagger.json')
    })
})