import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import { IngredientFactory } from '../src/ingredients'
import {
    BakeVariable,
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    IngredientManager,
    Logger
} from '@azbake/core'

function createEnvironment(): IBakeEnvironment {
    return {
        toolVersion: '0.0.0',
        environmentName: 'env',
        environmentCode: 'code',
        regions: [],
        authentication: {
            subscriptionId: 'sub',
            tenantId: 'tenant',
            serviceId: 'id',
            secretKey: 'key',
            certPath: '',
            skipAuth: true
        },
        variables: new Map(),
        logLevel: 'info'
    }
}

function createPackage(): IBakePackage {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'tst',
        version: '1.0.0',
        resourceGroup: false,
        parallelRegions: true,
        recipe: new Map(),
        variables: new Map()
    }

    return {
        Config: config,
        Environment: createEnvironment(),
        Authenticate: async () => true
    }
}

function createIngredient(): IIngredient {
    return {
        properties: {
            type: 'test-type',
            source: new BakeVariable('./src'),
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('IngredientFactory', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Build', () => {
        it('calls IngredientManager.CreateIngredient with correct parameters', () => {
            const ingredient = createIngredient()
            const pkg = createPackage()
            const region: IBakeRegion = { name: 'Global', shortName: 'global', code: 'glob' }
            const ctx = new DeploymentContext({} as any, pkg, region, new Logger())

            const mockIngredient = { Execute: async () => {} }
            const createStub = sandbox.stub(IngredientManager, 'CreateIngredient').returns(mockIngredient as any)

            const result = IngredientFactory.Build('test-name', ingredient, ctx)

            expect(createStub.calledOnce).eq(true)
            expect(createStub.firstCall.args[0]).eq('test-type')
            expect(createStub.firstCall.args[1]).eq('test-name')
            expect(createStub.firstCall.args[2]).eq(ingredient)
            expect(createStub.firstCall.args[3]).eq(ctx)
            expect(result).eq(mockIngredient)
        })

        it('returns null when CreateIngredient returns null', () => {
            const ingredient = createIngredient()
            const pkg = createPackage()
            const region: IBakeRegion = { name: 'Global', shortName: 'global', code: 'glob' }
            const ctx = new DeploymentContext({} as any, pkg, region, new Logger())

            sandbox.stub(IngredientManager, 'CreateIngredient').returns(null)

            const result = IngredientFactory.Build('test-name', ingredient, ctx)

            expect(result).eq(null)
        })
    })
})
