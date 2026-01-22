import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import {
    BakeVariable,
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    Logger
} from '@azbake/core'

// Require the index module to verify exports (CommonJS)
const propertyServiceIndex = require('../src/index')

function createLogger() {
    const logs: string[] = []
    const errors: string[] = []
    const logger = {
        log: (msg: string) => logs.push(msg),
        error: (msg: string) => errors.push(msg),
        debug: (msg: string) => logs.push(msg),
        getPre: () => 'test'
    } as unknown as Logger

    return { logger, logs, errors }
}

function createContext(source?: BakeVariable): DeploymentContext {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'pkg',
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map()
    }

    const env: IBakeEnvironment = {
        toolVersion: '0.0.0',
        environmentName: 'Dev',
        environmentCode: 'dev',
        regions: [{ name: 'East', shortName: 'east', code: 'eus' }],
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

    const defaultSource = source || new BakeVariable({ baseUrl: 'https://base', resourceUrl: 'https://resource' } as any)

    const ingredient: IIngredient = {
        properties: {
            type: '@azbake/ingredient-property-service',
            source: defaultSource,
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }

    const { logger } = createLogger()
    const context = new DeploymentContext({} as any, pkg, env.regions[0] as IBakeRegion, logger, ingredient)

    return context
}

function createIngredient(source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-property-service',
            source: source || new BakeVariable({ baseUrl: 'https://base', resourceUrl: 'https://resource' } as any),
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-property-service index exports', () => {
    it('exports plugin', () => {
        expect(propertyServiceIndex.plugin).to.not.be.undefined
        expect(typeof propertyServiceIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(propertyServiceIndex.pluginNS).to.equal('@azbake/ingredient-property-service')
    })
})
