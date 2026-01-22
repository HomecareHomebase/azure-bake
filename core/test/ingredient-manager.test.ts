import { expect } from 'chai'
import 'mocha'
import * as path from 'path'

import { BakeVariable } from '../src/bake-variable'
import { DeploymentContext } from '../src/deployment-context'
import { Logger } from '../src/logger'
import { IngredientManager } from '../src/ingredient-manager'
import { IBakeConfig, IBakeEnvironment, IBakePackage, IBakeRegion, IIngredient } from '../src/bake-interfaces'

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

    const pkg: IBakePackage = {
        Config: config,
        Environment: env,
        Authenticate: async () => true
    }

    const region: IBakeRegion = { name: 'Global', shortName: 'global', code: 'glob' }
    return new DeploymentContext({} as any, pkg, region, new Logger())
}

function createIngredient(typeName: string): IIngredient {
    return {
        properties: {
            type: typeName,
            source: new BakeVariable('./src'),
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

function resetIngredientManager() {
    const manager = IngredientManager as any
    manager.ingredientTypes = new Map()
    manager.ingredientUtilTypes = new Map()
    manager.ingredientTypesVersions = new Map()
}

describe('IngredientManager.Register', () => {
    const fixtureModules = path.resolve(__dirname, '../../tests/fixtures/node_modules')
    const fallbackRoot = path.resolve(__dirname, '../../tests/fixtures/fallback')
    let originalCwd = process.cwd()
    let originalNodePath: string | undefined

    beforeEach(() => {
        resetIngredientManager()
        originalCwd = process.cwd()
        originalNodePath = process.env.NODE_PATH
    })

    afterEach(() => {
        process.chdir(originalCwd)
        if (originalNodePath) {
            process.env.NODE_PATH = originalNodePath
        } else {
            delete process.env.NODE_PATH
        }
        delete process.env.npm_ingredient_root
        require('module').Module._initPaths()
    })

    it('registers a resolvable module and captures its version', () => {
        process.env.NODE_PATH = fixtureModules
        require('module').Module._initPaths()

        IngredientManager.Register('@azbake/fixture-ingredient')

        const instance = IngredientManager.CreateIngredient('fixture', 'alpha', createIngredient('fixture'), createContext())
        expect(instance).not.null
        expect((instance as any)._ingredient.pluginVersion).eq('1.2.3')
    })

    it('uses fallback resolution and npm_ingredient_root for versioning', () => {
        process.chdir(fallbackRoot)
        process.env.npm_ingredient_root = path.join(fallbackRoot, 'node_modules')

        IngredientManager.Register('@azbake/fallback-ingredient')

        const instance = IngredientManager.CreateIngredient('fallback', 'alpha', createIngredient('fallback'), createContext())
        expect(instance).not.null
        expect((instance as any)._ingredient.pluginVersion).eq('2.0.0')
    })

        it('returns null for unregistered ingredient type', () => {
            const ctx = createContext()
            const ingredient = createIngredient('nonexistent')

            const instance = IngredientManager.CreateIngredient('nonexistent', 'alpha', ingredient, ctx)
            expect(instance).to.equal(null)
        })

        it('returns null for unregistered function type', () => {
            const ctx = createContext()

            const func = IngredientManager.getIngredientFunction('nonexistent-function', ctx)
            expect(func).to.equal(null)
        })

        it('builds empty wrapper eval when no utils are registered', () => {
            resetIngredientManager()

            const evalStr = IngredientManager.buildUtilWrapperEval('ctx', 'wrapper')
            expect(evalStr).to.equal('')
        })
})