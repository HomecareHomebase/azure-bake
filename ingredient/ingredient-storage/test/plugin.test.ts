import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import {
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    Logger,
    BakeVariable
} from '@azbake/core'

import { StorageUtils, BakeStorageAccount, BakeStorageContainer } from '../src/functions'

// Require the compiled modules to verify exports
const storageIndex = require('../dist/index')

function createContext(region?: IBakeRegion): DeploymentContext {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'tst',
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
            subscriptionId: 'test-sub-id',
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

    const testRegion: IBakeRegion = region || { name: 'Global', shortName: 'global', code: 'glob' }
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, testRegion, new Logger())
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-storage',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-storage index exports', () => {
    it('exports plugin', () => {
        expect(storageIndex.plugin).to.not.be.undefined
        expect(typeof storageIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(storageIndex.pluginNS).to.equal('@azbake/ingredient-storage')
    })

    it('exports functions', () => {
        expect(storageIndex.functions).to.not.be.undefined
        expect(typeof storageIndex.functions).to.equal('function')
        expect(storageIndex.functions.name).to.equal('StorageUtils')
    })

    it('exports functionsNS', () => {
        expect(storageIndex.functionsNS).to.equal('storage')
    })

    it('plugin can be constructed from export', () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)

        const Plugin = storageIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = storageIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('BakeStorageAccount', () => {
    it('initializes with default values', () => {
        const account = new BakeStorageAccount()

        expect(account.name).to.equal('')
        expect(account.rg).to.equal('')
        expect(account.key).to.equal('')
        expect(account.endpoints).to.be.undefined
    })

    it('allows setting properties', () => {
        const account = new BakeStorageAccount()
        account.name = 'myaccount'
        account.rg = 'myrg'
        account.key = 'mykey'
        account.endpoints = { blob: 'https://test.blob.core.windows.net/' }

        expect(account.name).to.equal('myaccount')
        expect(account.rg).to.equal('myrg')
        expect(account.key).to.equal('mykey')
        expect(account.endpoints).to.deep.equal({ blob: 'https://test.blob.core.windows.net/' })
    })
})

describe('BakeStorageContainer', () => {
    it('initializes with undefined values', () => {
        const container = new BakeStorageContainer()

        expect(container.account).to.be.undefined
        expect(container.container).to.be.undefined
    })

    it('allows setting properties', () => {
        const account = new BakeStorageAccount()
        account.name = 'myaccount'

        const container = new BakeStorageContainer()
        container.account = account
        container.container = 'mycontainer'

        expect(container.account).to.equal(account)
        expect(container.container).to.equal('mycontainer')
    })
})
