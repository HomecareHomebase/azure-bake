import { expect } from 'chai'
import 'mocha'

import { Logger } from '../src/logger'

describe('Logger', () => {
    it('returns prefixes and log level', () => {
        const logger = new Logger(['alpha', 'beta'], 'info')
        expect(logger.getPre()).to.deep.equal(['alpha', 'beta'])
        expect(logger.getLogLevel()).to.equal('info')
    })

    it('emits info, warn, and error at info level', () => {
        const original = {
            log: console.log,
            warn: console.warn,
            error: console.error
        }
        const calls = { log: 0, warn: 0, error: 0 }

        console.log = (() => {
            calls.log += 1
        }) as any
        console.warn = (() => {
            calls.warn += 1
        }) as any
        console.error = (() => {
            calls.error += 1
        }) as any

        try {
            const logger = new Logger([], 'info')
            logger.debug('debug')
            logger.log('log')
            logger.warn('warn')
            logger.error('error')

            expect(calls.log).to.equal(1)
            expect(calls.warn).to.equal(1)
            expect(calls.error).to.equal(1)
        } finally {
            console.log = original.log
            console.warn = original.warn
            console.error = original.error
        }
    })

    it('emits debug messages only at debug level', () => {
        const original = {
            log: console.log,
            warn: console.warn,
            error: console.error
        }
        const calls = { log: 0, warn: 0, error: 0 }

        console.log = (() => {
            calls.log += 1
        }) as any
        console.warn = (() => {
            calls.warn += 1
        }) as any
        console.error = (() => {
            calls.error += 1
        }) as any

        try {
            const logger = new Logger([], 'debug')
            logger.debug('debug')
            logger.log('log')
            logger.warn('warn')
            logger.error('error')

            expect(calls.log).to.equal(1)
            expect(calls.warn).to.equal(1)
            expect(calls.error).to.equal(2)
        } finally {
            console.log = original.log
            console.warn = original.warn
            console.error = original.error
        }
    })
})