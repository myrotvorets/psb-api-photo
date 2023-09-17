/* eslint-disable import/no-named-as-default-member */
import { after, afterEach, before, describe, it } from 'mocha';
import express, { type Express } from 'express';
import request from 'supertest';
import * as knexpkg from 'knex';
import mockKnex from 'mock-knex';
import { Model } from 'objection';
import { buildKnexConfig } from '../../../src/knexfile.mjs';
import { configureApp } from '../../../src/server.mjs';
import { environment } from '../../../src/lib/environment.mjs';

describe('PhotoController', () => {
    let app: Express;
    let db: knexpkg.Knex;

    before(() => {
        const env = { ...process.env };

        try {
            process.env = {
                NODE_ENV: 'test',
                PORT: '3030',
                PHOTOS_BASE_URL: 'https://example.com/',
            };

            environment(true);

            app = express();

            const { knex } = knexpkg.default;
            db = knex(buildKnexConfig({ MYSQL_DATABASE: 'fake' }));
            mockKnex.mock(db);
            Model.knex(db);

            return configureApp(app);
        } finally {
            process.env = { ...env };
        }
    });

    after(() => mockKnex.unmock(db));
    afterEach(() => mockKnex.getTracker().uninstall());

    describe('Error handling', () => {
        describe('criminalsHandler', () => {
            it(':after should be a number', () => {
                return request(app)
                    .get('/suspects/after/1')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':after should be non-negative', () => {
                return request(app)
                    .get('/suspects/-1/1')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be a number', () => {
                return request(app)
                    .get('/suspects/0/count')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be positive', () => {
                return request(app)
                    .get('/suspects/0/0')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be less than 100', () => {
                return request(app)
                    .get('/suspects/0/101')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('criminalPhotosHandler', () => {
            it(':id should be a number', () => {
                return request(app)
                    .get('/suspects/id')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':id should be positive', () => {
                return request(app)
                    .get('/suspects/0')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('getPhotoHandler', () => {
            it(':id should be a number', () => {
                return request(app)
                    .get('/id')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':id should be positive', () => {
                return request(app)
                    .get('/0')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('getFaceXPhotoHandler', () => {
            it(':id should be a number', () => {
                return request(app)
                    .get('/id/facex')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':id should be positive', () => {
                return request(app)
                    .get('/0/facex')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('setSyncStatusHandler', () => {
            it(':id should be a number', () => {
                return request(app)
                    .put('/sync/id')
                    .set('Content-Type', 'application/json')
                    .send({ success: true })
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':id should be positive', () => {
                return request(app)
                    .put('/sync/0')
                    .set('Content-Type', 'application/json')
                    .send({ success: true })
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it('Content-Type should be application/json', () => {
                return request(app)
                    .put('/sync/1')
                    .set('Content-Type', 'text/plain')
                    .send('{ "success": true }')
                    .expect(415)
                    .expect(/"code":"UNSUPPORTED_MEDIA_TYPE"/u);
            });

            it('request body should be parseable', () => {
                return request(app)
                    .put('/sync/1')
                    .set('Content-Type', 'application/json')
                    .send('abrakadabra')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it('request body should have "success" property', () => {
                return request(app)
                    .put('/sync/1')
                    .send({ failure: false })
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it('"success" should be a boolean value', () => {
                return request(app)
                    .put('/sync/1')
                    .send({ success: 'false' })
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it('no additional properties are allowed', () => {
                return request(app)
                    .put('/sync/1')
                    .send({ success: false, reason: 'unknown' })
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('getCriminalsToSyncHandler', () => {
            it(':after should be a number', () => {
                return request(app)
                    .get('/sync/suspects/after/1')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':after should be non-negative', () => {
                return request(app)
                    .get('/sync/suspects/-1/1')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be a number', () => {
                return request(app)
                    .get('/sync/suspects/0/count')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be positive', () => {
                return request(app)
                    .get('/sync/suspects/0/0')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be less than 100', () => {
                return request(app)
                    .get('/sync/suspects/0/101')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('markCriminalSyncedHandler', () => {
            it(':id should be a number', () => {
                return request(app)
                    .delete('/sync/suspects/id')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':id should be positive', () => {
                return request(app)
                    .delete('/sync/suspects/0')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });
    });
});
