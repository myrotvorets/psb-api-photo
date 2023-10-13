/* eslint-disable import/no-named-as-default-member */
import { expect } from 'chai';
import { matchers, when } from 'testdouble';
import type { Knex } from 'knex';
import mockKnex from 'mock-knex';
import { asClass } from 'awilix';
import { HttpError } from '../../../src/lib/httperror.mjs';
import { SyncFlag } from '../../../src/models/sync.mjs';
import { container, initializeContainer } from '../../../src/lib/container.mjs';
import type { DbSyncStats, PhotoServiceInterface } from '../../../src/services/photoserviceinterface.mjs';
import { FakeImageService, toFaceXFormatMock } from './fakeimageservice.mjs';
import { FakeDownloadService, downloadMock } from './fakedownloadservice.mjs';

describe('PhotoService', function () {
    let baseURL: string;
    let db: Knex;
    let httpResponse: ArrayBuffer;

    before(async function () {
        await container.dispose();
        initializeContainer();
        container.register({
            imageService: asClass(FakeImageService).singleton(),
            downloadService: asClass(FakeDownloadService).singleton(),
        });

        db = container.resolve('db');
        mockKnex.mock(db);

        baseURL = container.resolve('downloadService').baseURL;
        httpResponse = Buffer.from('Set phasers to stun!');
    });

    after(function () {
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
                    .and.containSubset({ method: 'pluck', bindings: [0, 10] });
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
                    .and.containSubset({ method: 'first', bindings: [attachmentID, 'image/%', 1] });
                query.response([]);
            });
            tracker.install();

            const expected = [null, null];

            const svc = container.resolve('photoService');
            return expect(svc.downloadPhoto(attachmentID)).to.become(expected);
        });

        it('should return the expected photo', function () {
            const attachmentID = 123;
            const dbResponse = [{ att_id: 1, path: 'criminal/00/00/7b/xxx.jpg', mime_type: 'image/jpeg' }];

            when(downloadMock(matchers.anything() as string)).thenResolve(httpResponse);

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                expect(query)
                    .to.be.an('object')
                    .and.containSubset({ method: 'first', bindings: [attachmentID, 'image/%', 1] });
                query.response(dbResponse);
            });
            tracker.install();

            const expected = [httpResponse, dbResponse[0]!.mime_type];
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
                    .and.containSubset({ method: 'first', bindings: ['image/%', attachmentID, 1] });
                query.response([]);
            });
            tracker.install();

            const expected = null;
            const svc = container.resolve('photoService');
            return expect(svc.downloadPhotoForFaceX(attachmentID)).to.become(expected);
        });

        it('should process photos', function () {
            const attachmentID = 123;
            const dbResponse = [{ att_id: 1, path: 'criminal/00/00/7b/xxx.jpg', mime_type: 'image/jpeg' }];

            when(downloadMock(matchers.anything() as string)).thenResolve(httpResponse);

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                expect(query)
                    .to.be.an('object')
                    .and.containSubset({ method: 'first', bindings: [attachmentID, 'image/%', 1] });
                query.response(dbResponse);
            });
            tracker.install();

            const expected = Buffer.from(httpResponse);

            when(toFaceXFormatMock(matchers.anything() as Buffer)).thenResolve(expected);

            const svc = container.resolve('photoService');
            return expect(svc.downloadPhotoForFaceX(attachmentID)).to.become(expected);
        });
    });

    describe('#getPhotoToSync', function () {
        const checkQuery = (query: mockKnex.QueryDetails, step: number): void => {
            expect(step).to.equal(1);
            expect(query)
                .to.be.an('object')
                .and.containSubset({ method: 'first', bindings: [SyncFlag.FAILED_ADD, 1] });
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
                const toFaceXResponse = Buffer.from(httpResponse);
                when(downloadMock(matchers.anything() as string)).thenResolve(httpResponse);
                when(toFaceXFormatMock(matchers.anything() as Buffer)).thenResolve(Buffer.from(toFaceXResponse));

                const expected = {
                    id: dbResponse[0]!['id'],
                    att_id: dbResponse[0]!['att_id'],
                    suspect_id: dbResponse[0]!['criminal_id'],
                    path: dbResponse[0]!['path'],
                    flag: dbResponse[0]!['flag'],
                    image: toFaceXResponse.toString('base64'),
                };

                const actual = await svc.getPhotoToSync();
                expect(actual).to.deep.equal(expected);
            });

            it('should return empty string if image download fails', async function () {
                when(downloadMock(matchers.anything() as string)).thenReject(new HttpError(400));

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
                when(downloadMock(matchers.anything() as string)).thenResolve(httpResponse);
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

    describe('#getDbSyncStats', function () {
        it('should return database sync stats', function () {
            const expected: DbSyncStats = {
                photos_to_add: 10,
                photos_to_del: 5,
                photos_add_failed: 1,
                photos_del_failed: 1,
                suspects: 2,
            };

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                switch (step) {
                    case 1:
                        expect(query.method).to.equal('select');
                        expect(query.sql).to.contain('count').and.not.to.contain('distinct');
                        query.response([
                            { flag: 0, count: expected.photos_to_add },
                            { flag: 1, count: expected.photos_to_del },
                            { flag: 2, count: expected.photos_add_failed },
                            { flag: 3, count: expected.photos_del_failed },
                        ]);
                        break;

                    case 2:
                        expect(query.method).to.equal('pluck');
                        expect(query.sql).to.contain('count').and.to.contain('distinct');
                        query.response([{ count: expected.suspects }]);
                        break;

                    default:
                        expect.fail(`Unexpected step number: ${step}`);
                }
            });

            tracker.install();
            const service = container.resolve('photoService');
            return expect(service.getDbSyncStats()).to.become(expected);
        });

        it('should fill missing stats with zeros', function () {
            const expected: DbSyncStats = {
                photos_to_add: 0,
                photos_to_del: 0,
                photos_add_failed: 0,
                photos_del_failed: 0,
                suspects: 0,
            };

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                switch (step) {
                    case 1:
                        expect(query.method).to.equal('select');
                        expect(query.sql).to.contain('count').and.not.to.contain('distinct');
                        query.response([]);
                        break;

                    case 2:
                        expect(query.method).to.equal('pluck');
                        expect(query.sql).to.contain('count').and.to.contain('distinct');
                        query.response([]);
                        break;

                    default:
                        expect.fail(`Unexpected step number: ${step}`);
                }
            });

            tracker.install();
            const service = container.resolve('photoService');
            return expect(service.getDbSyncStats()).to.become(expected);
        });
    });
});
