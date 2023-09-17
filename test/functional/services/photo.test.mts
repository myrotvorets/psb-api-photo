/* eslint-disable import/no-named-as-default-member */
import { after, afterEach, before, describe, it } from 'mocha';
import { expect } from 'chai';
import * as knexpkg from 'knex';
import mockKnex from 'mock-knex';
import { Model } from 'objection';
import { buildKnexConfig } from '../../../src/knexfile.mjs';
import { PhotoService } from '../../../src/services/photo.mjs';

describe('PhotoService', () => {
    let db: knexpkg.Knex;

    before(() => {
        const { knex } = knexpkg.default;
        db = knex(buildKnexConfig({ MYSQL_DATABASE: 'fake' }));
        mockKnex.mock(db);
        Model.knex(db);
    });

    after(() => mockKnex.unmock(db));

    afterEach(() => mockKnex.getTracker().uninstall());

    describe('#getCriminalIDs', () => {
        it('should return the expected results', () => {
            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                expect(query)
                    .to.be.an('object')
                    .and.containSubset({ method: 'select', bindings: ['image/%', 0, 10] });
                query.response([]);
            });
            tracker.install();

            const expected: number[] = [];
            return expect(PhotoService.getCriminalIDs(0, 10)).to.become(expected);
        });
    });

    describe('#getCriminalsToSync', () => {
        it('should return the expected results', () => {
            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                expect(query)
                    .to.be.an('object')
                    .and.containSubset({ method: 'select', bindings: [0, 10] });
                query.response([]);
            });
            tracker.install();

            const expected: number[] = [];
            return expect(PhotoService.getCriminalsToSync(0, 10)).to.become(expected);
        });
    });

    describe('#markCriminalSynced', () => {
        it('should return the expected results', () => {
            const id = 53;
            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                expect(query)
                    .to.be.an('object')
                    .and.containSubset({
                        method: 'del',
                        bindings: [id],
                    });

                query.response([]);
            });
            tracker.install();

            return PhotoService.markCriminalSynced(id);
        });
    });

    describe('#setSyncStatus', () => {
        const id = 53;

        const table = [
            [true, { method: 'del', bindings: [id], step: 1 }],
            [false, { method: 'update', bindings: [id], step: 1 }],
        ] as const;

        table.forEach(([success, expectations]) => {
            it(`should return the expected results (success = ${success})`, () => {
                const tracker = mockKnex.getTracker();
                tracker.on('query', (query) => {
                    expect(query).to.be.an('object').and.containSubset(expectations);
                    query.response([]);
                });
                tracker.install();

                return PhotoService.setSyncStatus(id, success);
            });
        });
    });
});
