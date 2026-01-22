import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import {
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    Logger,
    IngredientManager
} from '@azbake/core'

import { PostgreSQLDBUtils } from '../src/functions'

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

describe('PostgreSQLDBUtils', () => {
    let sandbox: sinon.SinonSandbox
    let ctx: DeploymentContext

    beforeEach(() => {
        sandbox = sinon.createSandbox()
        ctx = createContext()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('returns resource name from coreutils', () => {
            const mockCreateResourceName = sandbox.stub().returns('test-pgsql-name')
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns({
                create_resource_name: mockCreateResourceName
            })

            const utils = new PostgreSQLDBUtils(ctx)
            const name = utils.create_resource_name()

            expect(name).to.equal('test-pgsql-name')
            expect(mockCreateResourceName.calledWith('pgsql', null, true)).to.be.true
        })
    })

    describe('create_resource_uri', () => {
        it('returns URI for public access', () => {
            const mockCreateResourceName = sandbox.stub().returns('myserver')
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns({
                create_resource_name: mockCreateResourceName
            })

            const utils = new PostgreSQLDBUtils(ctx)
            const uri = utils.create_resource_uri('public')

            expect(uri).to.equal('myserver.postgres.database.azure.com')
        })

        it('returns URI for private access with private infix', () => {
            const mockCreateResourceName = sandbox.stub().returns('myserver')
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns({
                create_resource_name: mockCreateResourceName
            })

            const utils = new PostgreSQLDBUtils(ctx)
            const uri = utils.create_resource_uri('private')

            expect(uri).to.equal('myserver.private.postgres.database.azure.com')
        })
    })
})
