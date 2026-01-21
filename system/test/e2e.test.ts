import { expect } from 'chai'
import 'mocha'
import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const systemRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(systemRoot, '..')
const cliPath = path.join(systemRoot, 'src', 'index.ts')
const recipePath = path.join(repoRoot, 'tests', 'fixtures', 'recipes', 'e2e.yaml')
const outputPath = path.join(path.dirname(recipePath), 'e2e.out')
const snapshotPath = path.join(repoRoot, 'tests', 'snapshots', 'e2e-cli.log')
const serveEnvRecipePath = path.join(repoRoot, 'tests', 'fixtures', 'recipes', 'serve-env.yaml')
const serveEnvOutputPath = path.join(path.dirname(serveEnvRecipePath), 'serve-env.out')
const serveEnvSnapshotPath = path.join(repoRoot, 'tests', 'snapshots', 'serve-env-cli.log')

function normalizeOutput(output: string): string {
    return output
        .split(/\r?\n/)
        .map((line) => line.replace(/\x1b\[[0-9;]*m/g, '').replace(/\[[^\]]+\]\s*/g, '').trim())
        .filter((line) =>
            line.startsWith('Bake CLI v') ||
            line.includes('logging into azure') ||
            line.includes('Skipping Azure login') ||
            line.includes('Baking recipe') ||
            line.includes('Finished baking')
        )
        .map((line) => line.replace(/Bake CLI v[0-9A-Za-z.-]+/g, 'Bake CLI v<version>'))
        .join('\n')
}

function runServe(recipe: string, extraArgs: string[] = []) {
    const recipeArg = recipe.split(path.sep).join('/')
    return spawnSync(process.execPath, [
        '-r',
        'ts-node/register',
        cliPath,
        'serve',
        recipeArg,
        '--skip-auth',
        'true',
        ...extraArgs
    ], {
        cwd: systemRoot,
        env: { ...process.env },
        encoding: 'utf8'
    })
}

describe('bake CLI E2E', () => {
    beforeEach(() => {
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath)
        }
    })

    afterEach(() => {
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath)
        }
    })

    it('runs a local recipe and writes output', () => {
        const result = runServe(recipePath)

        expect(result.status).eq(0)
        expect(fs.existsSync(outputPath)).eq(true)
        expect(fs.readFileSync(outputPath, 'utf8')).eq('ok:hello')

        const snapshot = fs.readFileSync(snapshotPath, 'utf8').trim()
        const normalized = normalizeOutput(`${result.stdout}\n${result.stderr}`)
        expect(normalized).to.equal(snapshot)
    })

    it('runs additional golden fixture recipes with stable logs', () => {
        if (fs.existsSync(serveEnvOutputPath)) {
            fs.unlinkSync(serveEnvOutputPath)
        }

        const regions = JSON.stringify([{ name: 'North', shortName: 'north', code: 'nrth' }])
        const result = runServe(serveEnvRecipePath, [
            '--env-name',
            'TestEnv',
            '--env-code',
            'tst1',
            '--regions',
            regions
        ])

        expect(result.status).eq(0)
        expect(fs.existsSync(serveEnvOutputPath)).eq(true)
        expect(fs.readFileSync(serveEnvOutputPath, 'utf8')).eq('ok:TestEnv:tst1')

        const snapshot = fs.readFileSync(serveEnvSnapshotPath, 'utf8').trim()
        const normalized = normalizeOutput(`${result.stdout}\n${result.stderr}`)
        expect(normalized).to.equal(snapshot)

        if (fs.existsSync(serveEnvOutputPath)) {
            fs.unlinkSync(serveEnvOutputPath)
        }
    })
})