import { expect } from 'chai'
import 'mocha'

describe('index.ts exports', () => {
    let indexModule: any

    before(() => {
        indexModule = require('../src/index')
    })

    describe('plugin export', () => {
        it('exports the ApimPlugin class', () => {
            expect(indexModule.plugin).to.not.be.undefined
            expect(indexModule.plugin.name).to.equal('ApimPlugin')
        })

        it('plugin is a constructor function', () => {
            expect(typeof indexModule.plugin).to.equal('function')
        })
    })

    describe('pluginNS export', () => {
        it('exports the correct plugin namespace', () => {
            expect(indexModule.pluginNS).to.equal('@azbake/ingredient-apim')
        })
    })

    describe('functions export', () => {
        it('exports the ApimUtils class', () => {
            expect(indexModule.functions).to.not.be.undefined
            expect(indexModule.functions.name).to.equal('ApimUtils')
        })

        it('functions is a constructor function', () => {
            expect(typeof indexModule.functions).to.equal('function')
        })
    })

    describe('functionsNS export', () => {
        it('exports the correct functions namespace', () => {
            expect(indexModule.functionsNS).to.equal('apim')
        })
    })

    describe('module structure', () => {
        it('has all required exports', () => {
            expect(indexModule).to.have.property('plugin')
            expect(indexModule).to.have.property('pluginNS')
            expect(indexModule).to.have.property('functions')
            expect(indexModule).to.have.property('functionsNS')
        })

        it('plugin and functions are different classes', () => {
            expect(indexModule.plugin).to.not.equal(indexModule.functions)
        })

        it('namespaces are different strings', () => {
            expect(indexModule.pluginNS).to.not.equal(indexModule.functionsNS)
        })
    })
})
