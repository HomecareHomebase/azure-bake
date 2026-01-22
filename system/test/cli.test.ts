import { expect } from 'chai'
import 'mocha'
import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const systemRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(systemRoot, '..')
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures')
const recipesRoot = path.join(fixturesRoot, 'recipes')
const cliPath = path.join(systemRoot, 'src', 'index.ts')

function runCli(args: string[]) {
    return spawnSync(process.execPath, ['-r', 'ts-node/register', cliPath, ...args], {
        cwd: systemRoot,
        env: { ...process.env },
        encoding: 'utf8'
    })
}

describe('bake CLI parsing', () => {
    it('prints help with no args', () => {
        const result = runCli([])
        expect(result.status).eq(0)
        expect(result.stdout).to.contain('bake [command] [options] <image|file>')
        expect(result.stdout).to.contain('optional environment variables')
    })

    it('requires runtime for mix', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-cli-'))
        const bakeFile = path.join(tempDir, 'bake.yaml')
        fs.writeFileSync(bakeFile, 'name: temp\nshortName: tmp\nversion: 1.0.0\nrecipe: {}\n')

        const result = runCli(['mix', bakeFile, '--name', 'test'])
        expect(result.status).eq(0)
        expect(result.stdout).to.contain('mix')
        expect(result.stdout).to.contain('--runtime')
    })

    it('requires name for mix', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-cli-'))
        const bakeFile = path.join(tempDir, 'bake.yaml')
        fs.writeFileSync(bakeFile, 'name: temp\nshortName: tmp\nversion: 1.0.0\nrecipe: {}\n')

        const result = runCli(['mix', bakeFile, '--runtime', 'latest'])
        expect(result.status).eq(0)
        expect(result.stdout).to.contain('mix')
        expect(result.stdout).to.contain('--name')
    })

    it('requires the mix target file to exist', () => {
        const missingFile = path.join(os.tmpdir(), 'missing-bake.yaml')
        const result = runCli(['mix', missingFile, '--runtime', 'latest', '--name', 'test'])
        expect(result.status).eq(0)
        expect(result.stdout).to.contain('mix')
        expect(result.stdout).to.contain('--runtime')
    })

    it('shows help for serve when required auth params are missing', () => {
        const result = runCli(['serve', 'dummy-image'])
        expect(result.status).eq(0)
        expect(result.stdout).to.contain('serve')
        expect(result.stdout).to.contain('BAKE_AUTH_SUBSCRIPTION_ID')
    })

    it('maps serve args into environment variables for local runs', () => {
        const recipePath = path.join(recipesRoot, 'serve-env.yaml')
        const recipeArg = recipePath.split(path.sep).join('/')
        const outputPath = path.join(recipesRoot, 'serve-env.out')

        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath)
        }

        const regions = JSON.stringify([{ name: 'North', shortName: 'north', code: 'nrth' }])
        const result = runCli([
            'serve',
            recipeArg,
            '--skip-auth',
            'true',
            '--env-name',
            'TestEnv',
            '--env-code',
            'tst1',
            '--regions',
            regions
        ])

        expect(result.status).eq(0)
        expect(fs.existsSync(outputPath)).eq(true)
        expect(fs.readFileSync(outputPath, 'utf8')).eq('ok:TestEnv:tst1')

        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath)
        }
    })

    describe('validateParams edge cases', () => {
        it('accepts serve with all auth params via CLI args', () => {
            const recipePath = path.join(recipesRoot, 'minimal.yaml')
            const recipeArg = recipePath.split(path.sep).join('/')
            const regions = JSON.stringify([{ name: 'East', shortName: 'east', code: 'eus' }])

            const result = runCli([
                'serve',
                recipeArg,
                '--env-name', 'Production',
                '--env-code', 'prd1',
                '--regions', regions,
                '--sub', 'test-sub-id',
                '--tenant', 'test-tenant-id',
                '--serviceid', 'test-service-id',
                '--key', 'test-secret-key',
                '--loglevel', 'debug'
            ])

            // Should attempt to run, may fail on actual execution but validates parsing
            expect(result.stdout).to.contain('Bake CLI v')
        })

        it('uses default region when regions not specified with skip-auth', () => {
            const recipePath = path.join(recipesRoot, 'serve-env.yaml')
            const recipeArg = recipePath.split(path.sep).join('/')

            const result = runCli([
                'serve',
                recipeArg,
                '--skip-auth', 'true',
                '--env-name', 'Test',
                '--env-code', 'tst1'
            ])

            // Should run with default Global region
            expect(result.status).eq(0)
        })

        it('shows help when serve has no target', () => {
            const result = runCli(['serve'])
            expect(result.status).eq(0)
            expect(result.stdout).to.contain('bake [command] [options]')
        })

        it('shows help when mix has no target', () => {
            const result = runCli(['mix'])
            expect(result.status).eq(0)
            expect(result.stdout).to.contain('bake [command] [options]')
        })

        it('shows help for unknown command', () => {
            const result = runCli(['unknown-cmd', 'some-target'])
            expect(result.status).eq(0)
            expect(result.stdout).to.contain('bake [command] [options]')
        })

        it('prefers CLI args over environment variables', () => {
            const recipePath = path.join(recipesRoot, 'serve-env.yaml')
            const recipeArg = recipePath.split(path.sep).join('/')
            const outputPath = path.join(recipesRoot, 'serve-env.out')

            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath)
            }

            const regions = JSON.stringify([{ name: 'CLI', shortName: 'cli', code: 'cli' }])

            // Set env vars that should be overridden
            const customEnv = {
                ...process.env,
                BAKE_ENV_NAME: 'EnvVar',
                BAKE_ENV_CODE: 'env1'
            }

            const result = spawnSync(process.execPath, [
                '-r', 'ts-node/register', 
                cliPath, 
                'serve',
                recipeArg,
                '--skip-auth', 'true',
                '--env-name', 'CLIArg',
                '--env-code', 'cli1',
                '--regions', regions
            ], {
                cwd: systemRoot,
                env: customEnv,
                encoding: 'utf8'
            })

            expect(result.status).eq(0)
            expect(fs.existsSync(outputPath)).eq(true)
            // The output should reflect CLI args, not env vars
            expect(fs.readFileSync(outputPath, 'utf8')).eq('ok:CLIArg:cli1')

            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath)
            }
        })
    })

    describe('serve with variables file', () => {
        it('accepts variables path via CLI arg', () => {
            const recipePath = path.join(recipesRoot, 'serve-env.yaml')
            const recipeArg = recipePath.split(path.sep).join('/')
            const variablesPath = path.join(fixturesRoot, 'variables.yaml')
            const outputPath = path.join(recipesRoot, 'serve-env.out')

            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath)
            }

            const regions = JSON.stringify([{ name: 'Test', shortName: 'test', code: 'tst' }])

            const result = runCli([
                'serve',
                recipeArg,
                '--skip-auth', 'true',
                '--env-name', 'VarTest',
                '--env-code', 'vr01',
                '--regions', regions,
                '--variables', variablesPath
            ])

            expect(result.status).eq(0)

            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath)
            }
        })
    })
})