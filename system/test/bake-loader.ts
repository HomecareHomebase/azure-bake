import { expect } from 'chai'
import 'mocha'
import * as path from 'path'

import { BakePackage } from '../src/bake-loader'
import { IngredientManager } from '@azbake/core'

const fixturesRoot = path.resolve(__dirname, '../../tests/fixtures')
const bakeFile = path.join(fixturesRoot, 'recipes', 'loader.yaml')
const variablesFile = path.join(fixturesRoot, 'variables.yaml')

function setEnv() {
    process.env.npm_ingredient_root = path.join(fixturesRoot, 'node_modules')
    process.env.NODE_PATH = process.env.npm_ingredient_root
    require('module').Module._initPaths()
    process.env.BAKE_ENV_NAME = 'test-env'
    process.env.BAKE_ENV_CODE = 'tst0'
    process.env.BAKE_ENV_REGIONS = JSON.stringify([
        { name: 'Global', code: 'glob', shortName: 'global' }
    ])

    process.env.BAKE_AUTH_SERVICE_ID = 'id'
    process.env.BAKE_AUTH_SERVICE_KEY = 'secret'
    process.env.BAKE_AUTH_TENANT_ID = 'tenant'
    process.env.BAKE_AUTH_SUBSCRIPTION_ID = 'sub'
    process.env.BAKE_VARIABLES = variablesFile
}

function restoreEnv(saved: NodeJS.ProcessEnv) {
    Object.keys(process.env).forEach((key) => {
        if (!(key in saved)) {
            delete process.env[key]
        }
    })

    Object.keys(saved).forEach((key) => {
        const value = saved[key]
        if (value !== undefined) {
            process.env[key] = value
        }
    })

    require('module').Module._initPaths()
}

describe('bake-loader', () => {
    let savedEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        savedEnv = { ...process.env }
        setEnv()
    })

    afterEach(() => {
        restoreEnv(savedEnv)
    })

    it('loads config, merges variables, and clears auth env', () => {
        const pkg = new BakePackage(bakeFile)

        expect(pkg).not.null
        expect(pkg.Environment).not.null
        expect(pkg.Environment.toolVersion).not.empty
        expect(pkg.Config.name).eq('test-package')
        expect(pkg.Config.shortName).eq('tstpkg')
        expect(pkg.Config.version).eq('1.0.0')

        expect(pkg.Config.parallelRegions).eq(true)
        expect(pkg.Config.resourceGroup).eq(true)

        const vars = pkg.Config.variables
        expect(vars?.get('foo')?.Code).eq('config')
        expect(vars?.get('bar')?.Code).eq('config')
        expect(vars?.get('baz')?.Code).eq('env')

        const recipe = pkg.Config.recipe
        const alpha = recipe.get('alpha')
        expect(alpha).not.null
        expect(alpha?.dependsOn).deep.eq([])
        expect(alpha?.properties.parameters.get('foo')?.Code).eq('bar')

        expect(process.env.BAKE_AUTH_SERVICE_ID).eq('')
        expect(process.env.BAKE_AUTH_SERVICE_KEY).eq('')
    })

    it('authenticate passes credentials then strips them from environment', async () => {
        const pkg = new BakePackage(bakeFile)

        const status = await pkg.Authenticate(async (auth) => {
            return auth.serviceId === 'id' && auth.secretKey === 'secret' && auth.subscriptionId === 'sub'
        })

        expect(status).true
        const auth = pkg.Environment.authentication as any
        expect(auth.subscriptionId).eq('sub')
        expect(auth.serviceId).eq(undefined)
        expect(auth.secretKey).eq(undefined)
    })

    it('trims ingredient versions before registration', () => {
        const originalRegister = IngredientManager.Register
        const registered: string[] = []

        IngredientManager.Register = ((name: string) => {
            registered.push(name)
        }) as any

        try {
            new BakePackage(bakeFile)
            expect(registered).to.include('@azbake/fixture-ingredient')
        } finally {
            IngredientManager.Register = originalRegister
        }
    })
})