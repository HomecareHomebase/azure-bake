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

import { StorageUtils } from '../src/functions'

function createContext(): DeploymentContext {
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

describe('StorageUtils', () => {
    it('creates a delete policy with default filters', () => {
        const utils = new StorageUtils(createContext())

        const rule = utils.add_delete_policy('delete-all', true, 90)

        expect(rule.name).to.equal('delete-all')
        expect(rule.enabled).to.equal(true)
        expect(rule.definition).to.exist

        const definition: any = rule.definition
        const filters: any = definition.filters
        expect(filters.blobTypes).to.deep.equal(['blockBlob'])
        expect(filters).to.not.have.property('prefixMatch')
        expect(filters).to.not.have.property('blobIndexMatch')
        expect(definition.actions.baseBlob.deleteProperty.daysAfterModificationGreaterThan).to.equal(90)
    })

    it('creates a delete policy with optional filters', () => {
        const utils = new StorageUtils(createContext())

        const rule = utils.add_delete_policy('delete-filtered', true, 14, {
            prefixMatch: ['logs/', 'cache/'],
            blobIndexMatch: [{ name: 'status', op: '==', value: 'archived' }],
            blobTypes: ['blockBlob', 'appendBlob']
        })

        const definition: any = rule.definition
        const filters: any = definition.filters
        expect(filters.blobTypes).to.deep.equal(['blockBlob', 'appendBlob'])
        expect(filters.prefixMatch).to.deep.equal(['logs/', 'cache/'])
        expect(filters.blobIndexMatch).to.deep.equal([{ name: 'status', op: '==', value: 'archived' }])
    })

    it('creates a policy from rules', () => {
        const utils = new StorageUtils(createContext())

        const ruleA = utils.add_delete_policy('delete-5', true, 5)
        const ruleB = utils.add_delete_policy('delete-30', false, 30, { prefixMatch: ['archive/'] })
        const policy = utils.create_policy(ruleA, ruleB)

        expect(policy.rules).to.deep.equal([ruleA, ruleB])
    })
})