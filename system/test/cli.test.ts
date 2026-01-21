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
})