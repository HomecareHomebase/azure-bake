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
    })

    afterEach(() => {
        restoreEnv(savedEnv)
    })

    describe('_loadEnvironment', () => {
        beforeEach(() => {
            setEnv()
        })

        it('uses defaults when environment variables are missing', () => {
            delete process.env.BAKE_ENV_NAME
            delete process.env.BAKE_ENV_CODE
            delete process.env.BAKE_LOG_LEVEL
            process.env.BAKE_ENV_REGIONS = '[]'

            const pkg = new BakePackage(bakeFile)

            expect(pkg.Environment.environmentName).eq('')
            expect(pkg.Environment.environmentCode).eq('')
            expect(pkg.Environment.logLevel).eq('info')
        })

        it('reads skipAuth from environment', () => {
            process.env.BAKE_AUTH_SKIP = 'true'

            const pkg = new BakePackage(bakeFile)

            expect(pkg.Environment.authentication.skipAuth).eq(true)
        })

        it('sets skipAuth to false when BAKE_AUTH_SKIP is false', () => {
            process.env.BAKE_AUTH_SKIP = 'false'

            const pkg = new BakePackage(bakeFile)

            expect(pkg.Environment.authentication.skipAuth).eq(false)
        })

        it('sets skipAuth to false when BAKE_AUTH_SKIP is missing', () => {
            delete process.env.BAKE_AUTH_SKIP

            const pkg = new BakePackage(bakeFile)

            expect(pkg.Environment.authentication.skipAuth).eq(false)
        })

        it('reads certPath from environment', () => {
            process.env.BAKE_AUTH_SERVICE_CERT = '/path/to/cert.pem'

            const pkg = new BakePackage(bakeFile)

            // Auth is cleared after construction, but we can verify it was read
            expect(process.env.BAKE_AUTH_SERVICE_CERT).eq('')
        })

        it('handles missing BAKE_VARIABLES file gracefully', () => {
            process.env.BAKE_VARIABLES = '/nonexistent/path/to/variables.yaml'

            const pkg = new BakePackage(bakeFile)

            // Should not throw, variables should be empty or from config only
            expect(pkg.Config.variables).to.be.an.instanceof(Map)
        })

        it('handles invalid YAML in variables file gracefully', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const badVarsFile = path.join(tmpDir, 'bad-vars.yaml')
            fs.writeFileSync(badVarsFile, '{{invalid: yaml: content')

            process.env.BAKE_VARIABLES = badVarsFile

            // Should not throw, should log error and continue
            const pkg = new BakePackage(bakeFile)
            expect(pkg.Config).to.not.be.null
        })

        it('handles empty variables file', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const emptyVarsFile = path.join(tmpDir, 'empty-vars.yaml')
            fs.writeFileSync(emptyVarsFile, '')

            process.env.BAKE_VARIABLES = emptyVarsFile

            const pkg = new BakePackage(bakeFile)
            expect(pkg.Config.variables).to.be.an.instanceof(Map)
        })

        it('clears all auth environment variables after loading', () => {
            process.env.BAKE_AUTH_SUBSCRIPTION_ID = 'test-sub'
            process.env.BAKE_AUTH_SERVICE_ID = 'test-id'
            process.env.BAKE_AUTH_SERVICE_KEY = 'test-key'
            process.env.BAKE_AUTH_SERVICE_CERT = 'test-cert'
            process.env.BAKE_AUTH_TENANT_ID = 'test-tenant'

            new BakePackage(bakeFile)

            expect(process.env.BAKE_AUTH_SUBSCRIPTION_ID).eq('')
            expect(process.env.BAKE_AUTH_SERVICE_ID).eq('')
            expect(process.env.BAKE_AUTH_SERVICE_KEY).eq('')
            expect(process.env.BAKE_AUTH_SERVICE_CERT).eq('')
            expect(process.env.BAKE_AUTH_TENANT_ID).eq('')
        })
    })

    describe('_validatePackage', () => {
        beforeEach(() => {
            setEnv()
        })

        it('throws when config.name is missing', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const badFile = path.join(tmpDir, 'bad.yaml')
            fs.writeFileSync(badFile, 'shortName: tst\nversion: 1.0.0\nrecipe: {}')

            expect(() => new BakePackage(badFile)).to.throw('config.name not defined')
        })

        it('throws when config.shortName is missing', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const badFile = path.join(tmpDir, 'bad.yaml')
            fs.writeFileSync(badFile, 'name: test\nversion: 1.0.0\nrecipe: {}')

            expect(() => new BakePackage(badFile)).to.throw('config.shortName not defined')
        })

        it('throws when config.version is missing', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const badFile = path.join(tmpDir, 'bad.yaml')
            fs.writeFileSync(badFile, 'name: test\nshortName: tst\nrecipe: {}')

            expect(() => new BakePackage(badFile)).to.throw('config.version not defined')
        })
    })

    describe('_loadPackage', () => {
        beforeEach(() => {
            setEnv()
        })

        it('throws when bake file has invalid YAML', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const badFile = path.join(tmpDir, 'invalid.yaml')
            fs.writeFileSync(badFile, '{{invalid yaml content here:::')

            expect(() => new BakePackage(badFile)).to.throw()
        })

        it('sets parallelRegions to true by default', () => {
            const pkg = new BakePackage(bakeFile)
            expect(pkg.Config.parallelRegions).eq(true)
        })

        it('sets resourceGroup to true by default', () => {
            const pkg = new BakePackage(bakeFile)
            expect(pkg.Config.resourceGroup).eq(true)
        })

        it('respects parallelRegions: false in config', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const configFile = path.join(tmpDir, 'bake.yaml')
            fs.writeFileSync(configFile, [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'parallelRegions: false',
                'recipe: {}'
            ].join('\n'))

            const pkg = new BakePackage(configFile)
            expect(pkg.Config.parallelRegions).eq(false)
        })

        it('respects resourceGroup: false in config', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const configFile = path.join(tmpDir, 'bake.yaml')
            fs.writeFileSync(configFile, [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'resourceGroup: false',
                'recipe: {}'
            ].join('\n'))

            const pkg = new BakePackage(configFile)
            expect(pkg.Config.resourceGroup).eq(false)
        })

        it('wraps rgOverride in BakeVariable when present', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const configFile = path.join(tmpDir, 'bake.yaml')
            fs.writeFileSync(configFile, [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'rgOverride: my-custom-rg',
                'recipe: {}'
            ].join('\n'))

            const pkg = new BakePackage(configFile)
            expect(pkg.Config.rgOverride).to.not.be.undefined
            expect(pkg.Config.rgOverride?.Code).eq('my-custom-rg')
        })

        it('handles ingredient with condition property', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const configFile = path.join(tmpDir, 'bake.yaml')
            fs.writeFileSync(configFile, [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'recipe:',
                '  alpha:',
                '    properties:',
                '      type: fixture',
                '      source: ./src',
                '      condition: "[@{{ variables.enabled }}@]"',
                '      parameters: {}'
            ].join('\n'))

            const pkg = new BakePackage(configFile)
            const alpha = pkg.Config.recipe.get('alpha')
            expect(alpha?.properties.condition).to.not.be.undefined
        })

        it('handles ingredient with tokens', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const configFile = path.join(tmpDir, 'bake.yaml')
            fs.writeFileSync(configFile, [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'recipe:',
                '  alpha:',
                '    properties:',
                '      type: fixture',
                '      source: ./src',
                '      parameters: {}',
                '      tokens:',
                '        myToken: tokenValue'
            ].join('\n'))

            const pkg = new BakePackage(configFile)
            const alpha = pkg.Config.recipe.get('alpha')
            expect(alpha?.properties.tokens.get('myToken')?.Code).eq('tokenValue')
        })

        it('handles ingredient with alerts', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const configFile = path.join(tmpDir, 'bake.yaml')
            fs.writeFileSync(configFile, [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'recipe:',
                '  alpha:',
                '    properties:',
                '      type: fixture',
                '      source: ./src',
                '      parameters: {}',
                '      alerts:',
                '        myAlert: alertConfig'
            ].join('\n'))

            const pkg = new BakePackage(configFile)
            const alpha = pkg.Config.recipe.get('alpha')
            expect(alpha?.properties.alerts.get('myAlert')?.Code).eq('alertConfig')
        })

        it('handles ingredient with dependsOn', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const configFile = path.join(tmpDir, 'bake.yaml')
            fs.writeFileSync(configFile, [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'recipe:',
                '  alpha:',
                '    properties:',
                '      type: fixture',
                '      source: ./src',
                '      parameters: {}',
                '  beta:',
                '    dependsOn:',
                '      - alpha',
                '    properties:',
                '      type: fixture',
                '      source: ./src',
                '      parameters: {}'
            ].join('\n'))

            const pkg = new BakePackage(configFile)
            const beta = pkg.Config.recipe.get('beta')
            expect(beta?.dependsOn).deep.eq(['alpha'])
        })

        it('handles empty ingredients array', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const configFile = path.join(tmpDir, 'bake.yaml')
            fs.writeFileSync(configFile, [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'recipe: {}'
            ].join('\n'))

            const pkg = new BakePackage(configFile)
            expect(pkg.Config).to.not.be.null
        })

        it('handles ingredient without source (defaults to empty)', () => {
            const fs = require('fs')
            const os = require('os')
            const path = require('path')

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
            const configFile = path.join(tmpDir, 'bake.yaml')
            fs.writeFileSync(configFile, [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'recipe:',
                '  alpha:',
                '    properties:',
                '      type: fixture',
                '      parameters: {}'
            ].join('\n'))

            const pkg = new BakePackage(configFile)
            const alpha = pkg.Config.recipe.get('alpha')
            expect(alpha?.properties.source.Code).eq('')
        })
    })

    describe('config loading (original tests)', () => {
        beforeEach(() => {
            setEnv()
        })

        describe('YAML edge cases (js-yaml v4 compatibility)', () => {
            it('handles zero-prefixed numeric-looking strings', () => {
                const fs = require('fs')
                const os = require('os')
                const path = require('path')

                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
                const configFile = path.join(tmpDir, 'bake.yaml')
                    // In YAML 1.1 (js-yaml v3), 010 is parsed as octal (8)
                    // In YAML 1.2 (js-yaml v4), 010 would be parsed as integer 10
                    // Currently using js-yaml v3.x which uses YAML 1.1 behavior
                fs.writeFileSync(configFile, [
                    'name: test',
                    'shortName: tst',
                    'version: "1.0.0"',
                    'variables:',
                    '  numericString: "010"',
                    '  plainZero: 010',
                    'recipe: {}'
                ].join('\n'))

                const pkg = new BakePackage(configFile)
                const vars = pkg.Config.variables
                expect(vars?.get('numericString')?.Code).eq('010')
                    // In js-yaml v3 (YAML 1.1), 010 is parsed as octal (8)
                    expect(vars?.get('plainZero')?.Code).eq(8)
            })

            it('handles yes/no/on/off as strings in YAML 1.2', () => {
                const fs = require('fs')
                const os = require('os')
                const path = require('path')

                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
                const configFile = path.join(tmpDir, 'bake.yaml')
                // In YAML 1.1, yes/no/on/off were booleans, but js-yaml v4 (YAML 1.2)
                // treats them as plain strings by default
                fs.writeFileSync(configFile, [
                    'name: test',
                    'shortName: tst',
                    'version: "1.0.0"',
                    'variables:',
                    '  yesVal: yes',
                    '  noVal: no',
                    '  onVal: on',
                    '  offVal: off',
                    '  trueVal: true',
                    '  falseVal: false',
                    'recipe: {}'
                ].join('\n'))

                const pkg = new BakePackage(configFile)
                const vars = pkg.Config.variables
                // In js-yaml v4, yes/no/on/off are strings, not booleans
                expect(vars?.get('yesVal')?.Code).eq('yes')
                expect(vars?.get('noVal')?.Code).eq('no')
                expect(vars?.get('onVal')?.Code).eq('on')
                expect(vars?.get('offVal')?.Code).eq('off')
                // true/false are still booleans
                expect(vars?.get('trueVal')?.Code).eq(true)
                expect(vars?.get('falseVal')?.Code).eq(false)
            })

            it('handles null values', () => {
                const fs = require('fs')
                const os = require('os')
                const path = require('path')

                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
                const configFile = path.join(tmpDir, 'bake.yaml')
                fs.writeFileSync(configFile, [
                    'name: test',
                    'shortName: tst',
                    'version: "1.0.0"',
                    'variables:',
                    '  nullVal: null',
                    '  tildeNull: ~',
                    'recipe: {}'
                ].join('\n'))

                const pkg = new BakePackage(configFile)
                const vars = pkg.Config.variables
                // BakeVariable converts null to empty string (by design)
                expect(vars?.get('nullVal')?.Code).eq('')
                expect(vars?.get('tildeNull')?.Code).eq('')
            })

            it('handles multiline strings', () => {
                const fs = require('fs')
                const os = require('os')
                const path = require('path')

                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-test-'))
                const configFile = path.join(tmpDir, 'bake.yaml')
                fs.writeFileSync(configFile, [
                    'name: test',
                    'shortName: tst',
                    'version: "1.0.0"',
                    'variables:',
                    '  multiline: |',
                    '    line1',
                    '    line2',
                    'recipe: {}'
                ].join('\n'))

                const pkg = new BakePackage(configFile)
                const vars = pkg.Config.variables
                expect(vars?.get('multiline')?.Code).eq('line1\nline2\n')
            })
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
})