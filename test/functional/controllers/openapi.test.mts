/* eslint-disable sonarjs/assertions-in-tests */
import type { Express } from 'express';
import request from 'supertest';
import type { Knex } from 'knex';
import mockKnex from 'mock-knex';
import { configureApp, createApp } from '../../../src/server.mjs';
import { container } from '../../../src/lib/container.mjs';

describe('PhotoController', function () {
    let app: Express;
    let db: Knex;

    before(async function () {
        await container.dispose();

        app = createApp();
        configureApp(app);
        db = container.resolve('db');

        mockKnex.mock(db);
    });

    after(function () {
        mockKnex.unmock(db);
    });

    describe('Error handling', function () {
        describe('criminalsHandler', function () {
            it(':after should be a number', function () {
                return request(app)
                    .get('/suspects/after/1')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':after should be non-negative', function () {
                return request(app)
                    .get('/suspects/-1/1')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be a number', function () {
                return request(app)
                    .get('/suspects/0/count')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be positive', function () {
                return request(app)
                    .get('/suspects/0/0')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be less than 100', function () {
                return request(app)
                    .get('/suspects/0/101')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('criminalPhotosHandler', function () {
            it(':id should be a number', function () {
                return request(app)
                    .get('/suspects/id')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':id should be positive', function () {
                return request(app)
                    .get('/suspects/0')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('getPhotoHandler', function () {
            it(':id should be a number', function () {
                return request(app)
                    .get('/id')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':id should be positive', function () {
                return request(app)
                    .get('/0')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('getFaceXPhotoHandler', function () {
            it(':id should be a number', function () {
                return request(app)
                    .get('/id/facex')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':id should be positive', function () {
                return request(app)
                    .get('/0/facex')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('setSyncStatusHandler', function () {
            it(':id should be a number', function () {
                return request(app)
                    .put('/sync/id')
                    .set('Content-Type', 'application/json')
                    .send({ success: true })
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':id should be positive', function () {
                return request(app)
                    .put('/sync/0')
                    .set('Content-Type', 'application/json')
                    .send({ success: true })
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it('Content-Type should be application/json', function () {
                return request(app)
                    .put('/sync/1')
                    .set('Content-Type', 'text/plain')
                    .send('{ "success": true }')
                    .expect(415)
                    .expect(/"code":"UNSUPPORTED_MEDIA_TYPE"/u);
            });

            it('request body should be parseable', function () {
                return request(app)
                    .put('/sync/1')
                    .set('Content-Type', 'application/json')
                    .send('abrakadabra')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it('request body should have "success" property', function () {
                return request(app)
                    .put('/sync/1')
                    .send({ failure: false })
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it('"success" should be a boolean value', function () {
                return request(app)
                    .put('/sync/1')
                    .send({ success: 'false' })
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it('no additional properties are allowed', function () {
                return request(app)
                    .put('/sync/1')
                    .send({ success: false, reason: 'unknown' })
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('getCriminalsToSyncHandler', function () {
            it(':after should be a number', function () {
                return request(app)
                    .get('/sync/suspects/after/1')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':after should be non-negative', function () {
                return request(app)
                    .get('/sync/suspects/-1/1')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be a number', function () {
                return request(app)
                    .get('/sync/suspects/0/count')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be positive', function () {
                return request(app)
                    .get('/sync/suspects/0/0')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':count should be less than 100', function () {
                return request(app)
                    .get('/sync/suspects/0/101')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });

        describe('markCriminalSyncedHandler', function () {
            it(':id should be a number', function () {
                return request(app)
                    .delete('/sync/suspects/id')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });

            it(':id should be positive', function () {
                return request(app)
                    .delete('/sync/suspects/0')
                    .expect(400)
                    .expect(/"code":"BAD_REQUEST"/u);
            });
        });
    });
});
