/* eslint-disable import/no-named-as-default-member */
import { expect } from 'chai';
import { matchers, when } from 'testdouble';
import type { Knex } from 'knex';
import mockKnex from 'mock-knex';
import nock from 'nock';
import { asClass } from 'awilix';
import { SyncFlag } from '../../../src/models/sync.mjs';
import { container, initializeContainer } from '../../../src/lib/container.mjs';
import type { PhotoServiceInterface } from '../../../src/services/photoserviceinterface.mjs';
import { FakeImageService, toFaceXFormatMock } from './fakeimageservice.mjs';

describe('PhotoService', function () {
    let db: Knex;

    before(async function () {
        await container.dispose();
        initializeContainer();
        container.register({
            imageService: asClass(FakeImageService).singleton(),
        });

        db = container.resolve('db');
        mockKnex.mock(db);

        nock.disableNetConnect();
    });

    after(function () {
        nock.enableNetConnect();
        mockKnex.unmock(db);
    });

    afterEach(function () {
        mockKnex.getTracker().uninstall();
    });

    describe('#getCriminalIDs', function () {
        it('should return the expected results', function () {
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
            const service = container.resolve('photoService');
            return expect(service.getCriminalIDs(0, 10)).to.become(expected);
        });
    });

    describe('#getCriminalPhotos', function () {
        it('should return the expected results', function () {
            const baseURL = process.env['PHOTOS_BASE_URL']!;
            const criminalID = 123;
            const dbResponse = [{ att_id: 1, path: 'criminal/00/00/7b/xxx.jpg', mime_type: 'image/jpeg' }];
            const expected = dbResponse.map((row) => ({
                att_id: row.att_id,
                url: `${baseURL}${row.path}`,
                mime_type: row.mime_type,
            }));

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                expect(query)
                    .to.be.an('object')
                    .and.containSubset({ method: 'select', bindings: ['image/%', criminalID] });
                query.response(dbResponse);
            });
            tracker.install();

            const service = container.resolve('photoService');
            return expect(service.getCriminalPhotos(criminalID)).to.become(expected);
        });
    });

    describe('#getCriminalsToSync', function () {
        it('should return the expected results', function () {
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
            const service = container.resolve('photoService');
            return expect(service.getCriminalsToSync(0, 10)).to.become(expected);
        });
    });

    describe('#downloadPhoto', function () {
        it('should handle non-existing IDs', function () {
            const attachmentID = 456;

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                expect(query)
                    .to.be.an('object')
                    .and.containSubset({ method: 'select', bindings: ['image/%', attachmentID] });
                query.response([]);
            });
            tracker.install();

            const expected = [null, null];

            const svc = container.resolve('photoService');
            return expect(svc.downloadPhoto(attachmentID)).to.become(expected);
        });

        it('should return the expected photo', function () {
            const baseURL = process.env['PHOTOS_BASE_URL']!;
            const attachmentID = 123;
            const dbResponse = [{ att_id: 1, path: 'criminal/00/00/7b/xxx.jpg', mime_type: 'image/jpeg' }];
            const httpResponse = 'test';

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                expect(query)
                    .to.be.an('object')
                    .and.containSubset({ method: 'select', bindings: ['image/%', attachmentID] });
                query.response(dbResponse);
            });
            tracker.install();

            nock(`${baseURL}`).get(`/${dbResponse[0]!.path}`).reply(200, httpResponse);

            const expected = [new Uint8Array(Buffer.from(httpResponse)).buffer, dbResponse[0]!.mime_type];

            const svc = container.resolve('photoService');
            return expect(svc.downloadPhoto(attachmentID)).to.become(expected);
        });
    });

    describe('#downloadPhotoForFaceX', function () {
        it('should handle non-existing IDs', function () {
            const attachmentID = 456;

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                expect(query)
                    .to.be.an('object')
                    .and.containSubset({ method: 'select', bindings: ['image/%', attachmentID] });
                query.response([]);
            });
            tracker.install();

            const expected = null;
            const svc = container.resolve('photoService');
            return expect(svc.downloadPhotoForFaceX(attachmentID)).to.become(expected);
        });

        it('should process photos', function () {
            const baseURL = process.env['PHOTOS_BASE_URL']!;
            const attachmentID = 123;
            const dbResponse = [{ att_id: 1, path: 'criminal/00/00/7b/xxx.jpg', mime_type: 'image/jpeg' }];
            const httpResponse = 'test';

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                expect(query)
                    .to.be.an('object')
                    .and.containSubset({ method: 'select', bindings: ['image/%', attachmentID] });
                query.response(dbResponse);
            });
            tracker.install();

            nock(`${baseURL}`).get(`/${dbResponse[0]!.path}`).reply(200, httpResponse);

            const expected = Buffer.from(httpResponse);
            when(toFaceXFormatMock(matchers.anything() as Buffer)).thenResolve(expected);

            const svc = container.resolve('photoService');
            return expect(svc.downloadPhotoForFaceX(attachmentID)).to.become(expected);
        });
    });

    describe('#getPhotoToSync', function () {
        // eslint-disable-next-line mocha/no-setup-in-describe
        const baseURL = process.env['PHOTOS_BASE_URL']!;

        const checkQuery = (query: mockKnex.QueryDetails, step: number): void => {
            expect(step).to.equal(1);
            expect(query)
                .to.be.an('object')
                .and.containSubset({ method: 'select', bindings: [SyncFlag.FAILED_ADD, 1] });
        };

        it('should handle empty queue', function () {
            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                checkQuery(query, step);
                query.response([]);
            });
            tracker.install();

            const expected = null;
            const svc = container.resolve('photoService');
            return expect(svc.getPhotoToSync()).to.become(expected);
        });

        it('should return DEL_PHOTO entries as is', function () {
            const dbResponse = [{ id: 1, att_id: 2, criminal_id: 3, path: 'test', flag: SyncFlag.DEL_PHOTO }];

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                checkQuery(query, step);
                query.response(dbResponse);
            });
            tracker.install();

            const expected = {
                id: dbResponse[0]!.id,
                att_id: dbResponse[0]!.att_id,
                suspect_id: dbResponse[0]!.criminal_id,
                path: dbResponse[0]!.path,
                flag: dbResponse[0]!.flag,
                image: '',
            };

            const svc = container.resolve('photoService');
            return expect(svc.getPhotoToSync()).to.become(expected);
        });

        describe('ADD_PHOTO processing', function () {
            const httpResponse = 'test';
            let dbResponse: Record<string, unknown>[];
            let svc: PhotoServiceInterface;

            before(function () {
                dbResponse = [
                    { id: 1, att_id: 2, criminal_id: 3, path: 'criminal/00/00/7b/xxx.jpg', flag: SyncFlag.ADD_PHOTO },
                ];

                svc = container.resolve('photoService');
            });

            beforeEach(function () {
                const tracker = mockKnex.getTracker();
                tracker.on('query', (query, step) => {
                    checkQuery(query, step);
                    query.response(dbResponse);
                });

                tracker.install();
            });

            it('should download the image', async function () {
                nock(`${baseURL}`).get(`/${dbResponse[0]!['path']}`).reply(200, httpResponse);
                when(toFaceXFormatMock(matchers.anything() as Buffer)).thenResolve(Buffer.from(httpResponse));

                const expected = {
                    id: dbResponse[0]!['id'],
                    att_id: dbResponse[0]!['att_id'],
                    suspect_id: dbResponse[0]!['criminal_id'],
                    path: dbResponse[0]!['path'],
                    flag: dbResponse[0]!['flag'],
                    image: Buffer.from(httpResponse).toString('base64'),
                };

                const actual = await svc.getPhotoToSync();
                expect(actual).to.deep.equal(expected);
            });

            it('should return empty string if image download fails', async function () {
                nock(`${baseURL}`).get(`/${dbResponse[0]!['path']}`).reply(400, '');

                const expected = {
                    id: dbResponse[0]!['id'],
                    att_id: dbResponse[0]!['att_id'],
                    suspect_id: dbResponse[0]!['criminal_id'],
                    path: dbResponse[0]!['path'],
                    flag: dbResponse[0]!['flag'],
                    image: '',
                };

                const actual = await svc.getPhotoToSync();
                expect(actual).to.deep.equal(expected);
            });

            it('should return empty string if image conversion fails', async function () {
                nock(`${baseURL}`).get(`/${dbResponse[0]!['path']}`).reply(200, httpResponse);
                when(toFaceXFormatMock(matchers.anything() as Buffer)).thenResolve(null);

                const expected = {
                    id: dbResponse[0]!['id'],
                    att_id: dbResponse[0]!['att_id'],
                    suspect_id: dbResponse[0]!['criminal_id'],
                    path: dbResponse[0]!['path'],
                    flag: dbResponse[0]!['flag'],
                    image: '',
                };

                const actual = await svc.getPhotoToSync();
                expect(actual).to.deep.equal(expected);
            });
        });
    });

    describe('#markCriminalSynced', function () {
        it('should return the expected results', async function () {
            const id = 53;
            const tracker = mockKnex.getTracker();
            let calls = 0;
            tracker.on('query', (query, step) => {
                ++calls;
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

            const service = container.resolve('photoService');
            await service.markCriminalSynced(id);
            expect(calls).to.equal(1);
        });
    });

    describe('#setSyncStatus', function () {
        const id = 53;

        const table = [
            [true, { method: 'del', bindings: [id], step: 1 }],
            [false, { method: 'update', bindings: [id], step: 1 }],
        ] as const;

        // eslint-disable-next-line mocha/no-setup-in-describe
        table.forEach(([success, expectations]) => {
            it(`should return the expected results (success = ${success})`, async function () {
                const tracker = mockKnex.getTracker();
                let calls = 0;
                tracker.on('query', (query) => {
                    ++calls;
                    expect(query).to.be.an('object').and.containSubset(expectations);
                    query.response([]);
                });
                tracker.install();

                const service = container.resolve('photoService');
                await service.setSyncStatus(id, success);
                expect(calls).to.equal(1);
            });
        });
    });
});
