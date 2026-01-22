import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { BakeVariable, DeploymentContext, Logger } from '@azbake/core'
import { IBakeConfig, IBakeEnvironment, IBakePackage, IBakeRegion, IIngredient } from '@azbake/core'

import { CustomScriptIngredient } from '../src/plugin'

// Require the index module to verify exports
const scriptIndex = require('../src/index')

function createContext(envVars?: Map<string, BakeVariable>): DeploymentContext {
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
        variables: envVars || new Map(),
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

function createIngredient(source: BakeVariable, params?: Map<string, BakeVariable>): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-script',
            source: source,
            parameters: params || new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-script index exports', () => {
    it('exports plugin', () => {
        expect(scriptIndex.plugin).to.not.be.undefined
        expect(typeof scriptIndex.plugin).to.equal('function')
        expect(scriptIndex.plugin).to.equal(CustomScriptIngredient)
    })

    it('exports pluginNS', () => {
        expect(scriptIndex.pluginNS).to.equal('@azbake/ingredient-script')
    })

    it('exports functions as null', () => {
        expect(scriptIndex.functions).to.be.null
    })

    it('exports functionsNS as null', () => {
        expect(scriptIndex.functionsNS).to.be.null
    })

    it('plugin can be constructed from export', () => {
        const ctx = createContext()
        const source = new BakeVariable('./test.ts')
        const ingredient = createIngredient(source)

        const Plugin = scriptIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)

        expect(instance).to.be.instanceOf(CustomScriptIngredient)
        expect(instance._name).to.equal('test')
    })
})

describe('CustomScriptIngredient', () => {
    let sandbox: sinon.SinonSandbox
    let tempDir: string

    beforeEach(() => {
        sandbox = sinon.createSandbox()
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-script-test-'))
    })

    afterEach(() => {
        sandbox.restore()
        // Cleanup temp directory
        if (tempDir && fs.existsSync(tempDir)) {
            try {
                // Clean up files first, then remove directory
                const files = fs.readdirSync(tempDir)
                for (const file of files) {
                    fs.unlinkSync(path.join(tempDir, file))
                }
                fs.rmdirSync(tempDir)
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    })

    describe('constructor', () => {
        it('creates instance with correct name and context', () => {
            const ctx = createContext()
            const source = new BakeVariable('./test.ts')
            const ingredient = createIngredient(source)

            const plugin = new CustomScriptIngredient('script-test', ingredient, ctx)

            expect(plugin._name).to.equal('script-test')
            expect(plugin._ctx).to.not.be.undefined
            expect(plugin._ctx.Environment.environmentName).to.equal('env')
        })
    })

    describe('Execute', () => {
        it('returns early when script file does not exist', async () => {
            const ctx = createContext()
            const source = new BakeVariable('/nonexistent/script.ts')
            const ingredient = createIngredient(source)

            const plugin = new CustomScriptIngredient('script', ingredient, ctx)

            // Should not throw, just return
            await plugin.Execute()
        })

        it('executes script with no parameters', async () => {
            const scriptPath = path.join(tempDir, 'simple.ts')
            const outputPath = path.join(tempDir, 'output.txt')

            fs.writeFileSync(scriptPath, `
                const fs = require('fs');
                function onExecute(ctx, logger, params) {
                    fs.writeFileSync('${outputPath.replace(/\\/g, '\\\\')}', 'executed');
                }
            `)

            const ctx = createContext()
            const source = new BakeVariable(scriptPath)
            const ingredient = createIngredient(source)

            const plugin = new CustomScriptIngredient('script', ingredient, ctx)
            await plugin.Execute()

            expect(fs.existsSync(outputPath)).to.be.true
            expect(fs.readFileSync(outputPath, 'utf8')).to.equal('executed')
        })

        it('passes multiple parameters to script', async () => {
            const scriptPath = path.join(tempDir, 'multiparams.ts')
            const outputPath = path.join(tempDir, 'multi-output.txt')

            fs.writeFileSync(scriptPath, `
                const fs = require('fs');
                function onExecute(ctx, logger, params) {
                    const result = params.first + ':' + params.second + ':' + params.third;
                    fs.writeFileSync('${outputPath.replace(/\\/g, '\\\\')}', result);
                }
            `)

            const params = new Map<string, BakeVariable>()
            params.set('first', new BakeVariable('alpha'))
            params.set('second', new BakeVariable('beta'))
            params.set('third', new BakeVariable('gamma'))

            const ctx = createContext()
            const source = new BakeVariable(scriptPath)
            const ingredient = createIngredient(source, params)

            const plugin = new CustomScriptIngredient('script', ingredient, ctx)
            await plugin.Execute()

            expect(fs.readFileSync(outputPath, 'utf8')).to.equal('alpha:beta:gamma')
        })

        it('handles numeric parameters', async () => {
            const scriptPath = path.join(tempDir, 'numeric.ts')
            const outputPath = path.join(tempDir, 'numeric-output.txt')

            fs.writeFileSync(scriptPath, `
                const fs = require('fs');
                function onExecute(ctx, logger, params) {
                    const sum = Number(params.a) + Number(params.b);
                    fs.writeFileSync('${outputPath.replace(/\\/g, '\\\\')}', String(sum));
                }
            `)

            const params = new Map<string, BakeVariable>()
            params.set('a', new BakeVariable('10'))
            params.set('b', new BakeVariable('20'))

            const ctx = createContext()
            const source = new BakeVariable(scriptPath)
            const ingredient = createIngredient(source, params)

            const plugin = new CustomScriptIngredient('script', ingredient, ctx)
            await plugin.Execute()

            expect(fs.readFileSync(outputPath, 'utf8')).to.equal('30')
        })

        it('throws error when script execution fails', async () => {
            const scriptPath = path.join(tempDir, 'error.ts')

            fs.writeFileSync(scriptPath, `
                function onExecute(ctx, logger, params) {
                    throw new Error('Script execution error');
                }
            `)

            const ctx = createContext()
            const source = new BakeVariable(scriptPath)
            const ingredient = createIngredient(source)

            const plugin = new CustomScriptIngredient('script', ingredient, ctx)

            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Script execution error')
            }
        })

        it('throws error on syntax error in script', async () => {
            const scriptPath = path.join(tempDir, 'syntax-error.ts')

            fs.writeFileSync(scriptPath, `
                function onExecute(ctx, logger, params) {
                    // Missing closing brace
            `)

            const ctx = createContext()
            const source = new BakeVariable(scriptPath)
            const ingredient = createIngredient(source)

            const plugin = new CustomScriptIngredient('script', ingredient, ctx)

            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error) {
                // Should throw some error due to syntax issue
                expect(error).to.not.be.undefined
            }
        })

        it('transpiles TypeScript to JavaScript before execution', async () => {
            const scriptPath = path.join(tempDir, 'typescript.ts')
            const outputPath = path.join(tempDir, 'ts-output.txt')

            // Use TypeScript-specific syntax that needs transpilation
            fs.writeFileSync(scriptPath, `
                const fs = require('fs');
                interface IParams {
                    value: string;
                }
                function onExecute(ctx: any, logger: any, params: IParams) {
                    const typed: string = params.value;
                    fs.writeFileSync('${outputPath.replace(/\\/g, '\\\\')}', typed);
                }
            `)

            const params = new Map<string, BakeVariable>()
            params.set('value', new BakeVariable('typescript-works'))

            const ctx = createContext()
            const source = new BakeVariable(scriptPath)
            const ingredient = createIngredient(source, params)

            const plugin = new CustomScriptIngredient('script', ingredient, ctx)
            await plugin.Execute()

            expect(fs.readFileSync(outputPath, 'utf8')).to.equal('typescript-works')
        })

        it('provides access to context in script', async () => {
            const scriptPath = path.join(tempDir, 'context.ts')
            const outputPath = path.join(tempDir, 'context-output.txt')

            fs.writeFileSync(scriptPath, `
                const fs = require('fs');
                function onExecute(ctx, logger, params) {
                    const env = ctx.Environment.environmentName;
                    fs.writeFileSync('${outputPath.replace(/\\/g, '\\\\')}', env);
                }
            `)

            const ctx = createContext()
            const source = new BakeVariable(scriptPath)
            const ingredient = createIngredient(source)

            const plugin = new CustomScriptIngredient('script', ingredient, ctx)
            await plugin.Execute()

            expect(fs.readFileSync(outputPath, 'utf8')).to.equal('env')
        })

        it('handles async operations in script', async () => {
            const scriptPath = path.join(tempDir, 'async.ts')
            const outputPath = path.join(tempDir, 'async-output.txt')

            fs.writeFileSync(scriptPath, `
                const fs = require('fs');
                async function onExecute(ctx, logger, params) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    fs.writeFileSync('${outputPath.replace(/\\/g, '\\\\')}', 'async-done');
                }
            `)

            const ctx = createContext()
            const source = new BakeVariable(scriptPath)
            const ingredient = createIngredient(source)

            const plugin = new CustomScriptIngredient('script', ingredient, ctx)
            await plugin.Execute()

            expect(fs.readFileSync(outputPath, 'utf8')).to.equal('async-done')
        })
    })
})

describe('ingredient-script', () => {
    it('executes a custom script and passes parameters', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-script-'))
        const scriptPath = path.join(tempDir, 'script.ts')
        const outputPath = path.join(tempDir, 'output.txt')

        const scriptContents = [
            "const fs = require('fs');",
            'function onExecute(ctx, logger, params) {',
            '  fs.writeFileSync(params.outputPath, `done:${params.foo}`);',
            '}'
        ].join('\n')

        fs.writeFileSync(scriptPath, scriptContents)

        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/ingredient-script',
                source: new BakeVariable(scriptPath),
                parameters: new Map([
                    ['outputPath', new BakeVariable(outputPath)],
                    ['foo', new BakeVariable('bar')]
                ]),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const ctx = createContext()
        const plugin = new CustomScriptIngredient('script', ingredient, ctx)

        await plugin.Execute()

        const output = fs.readFileSync(outputPath, 'utf8')
        expect(output).eq('done:bar')
    })
})