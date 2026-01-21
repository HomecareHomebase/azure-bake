import { expect } from 'chai'
import 'mocha'

import { Validations } from '../src/validations/validation'
import { SearchOperator } from '../src/models/searchOperator'

describe('property-service validations', () => {
    it('detects when a target has values', () => {
        const withValues = { target: { name: 't' }, name: 'value' }
        const withoutValues = { target: { name: 't' } }

        expect(Validations.TargetHasOneOrMoreValues(withValues.target, withValues)).to.equal(true)
        expect(Validations.TargetHasOneOrMoreValues(withoutValues.target, withoutValues)).to.equal(false)
    })

    it('checks date presence and ordering', () => {
        const now = new Date()
        const future = new Date(now.getTime() + 1000)
        const past = new Date(now.getTime() - 1000)

        expect(Validations.DateIsPresent(undefined)).to.equal(false)
        expect(Validations.DateIsPresent(now)).to.equal(true)

        expect(Validations.BeFutureDate(undefined)).to.equal(false)
        expect(Validations.BeFutureDate(future)).to.equal(true)
        expect(Validations.BeFutureDate(past)).to.equal(false)

        expect(Validations.BeLessThenExpiration(undefined, undefined)).to.equal(true)
        expect(Validations.BeLessThenExpiration(past, future)).to.equal(true)
        expect(Validations.BeLessThenExpiration(future, past)).to.equal(false)
    })

    it('validates search operators', () => {
        expect(Validations.BeSearchOperator(SearchOperator.None)).to.equal(true)
        expect(Validations.BeSearchOperator(SearchOperator.Equals)).to.equal(true)
        expect(Validations.BeSearchOperator(SearchOperator.Contains)).to.equal(true)
        expect(Validations.BeSearchOperator(undefined as any)).to.equal(false)
    })
})