/* eslint-disable import/no-named-as-default-member */
import { expect } from 'chai';
import { TestDouble, func, matchers, replaceEsm, verify, when } from 'testdouble';
import fetch from 'node-fetch';
import * as knexpkg from 'knex';
import mockKnex from 'mock-knex';
import nock from 'nock';
import { Model } from 'objection';
import type { JpegOptions, OutputInfo, Sharp } from 'sharp';
import { buildKnexConfig } from '../../../src/knexfile.mjs';
import { PhotoService } from '../../../src/services/photo.mjs';
import { SyncFlag } from '../../../src/models/sync.mjs';

describe('PhotoService', function () {
    let db: knexpkg.Knex;

    before(function () {
        const { knex } = knexpkg.default;
        db = knex(buildKnexConfig({ MYSQL_DATABASE: 'fake' }));
        mockKnex.mock(db);
        Model.knex(db);

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
            return expect(PhotoService.getCriminalIDs(0, 10)).to.become(expected);
        });
    });

    describe('#getCriminalPhotos', function () {
        it('should return the expected results', function () {
            const baseURL = 'https://localhost/';
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

            const svc = new PhotoService(baseURL, fetch);

            return expect(svc.getCriminalPhotos(criminalID)).to.become(expected);
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
            return expect(PhotoService.getCriminalsToSync(0, 10)).to.become(expected);
        });
    });

    describe('#downloadPhoto', function () {
        it('should handle non-existing IDs', function () {
            const baseURL = 'https://localhost/';
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

            const svc = new PhotoService(baseURL, fetch);

            const expected = [null, null];
            return expect(svc.downloadPhoto(attachmentID)).to.become(expected);
        });

        it('should return the expected photo', function () {
            const baseURL = 'https://localhost/';
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

            const svc = new PhotoService(baseURL, fetch);

            nock(`${baseURL}`).get(`/${dbResponse[0]!.path}`).reply(200, httpResponse);

            const expected = [new Uint8Array(Buffer.from(httpResponse)).buffer, dbResponse[0]!.mime_type];
            return expect(svc.downloadPhoto(attachmentID)).to.become(expected);
        });
    });

    describe('#downloadPhotoForFaceX', function () {
        let metadataMock: TestDouble<Sharp['metadata']>;
        let toBufferMock: TestDouble<Sharp['toBuffer']>;
        let jpegMock: TestDouble<Sharp['jpeg']>;

        let service: typeof import('../../../src/services/photo.mjs');

        beforeEach(async function () {
            metadataMock = func<Sharp['metadata']>();
            toBufferMock = func<Sharp['toBuffer']>();
            jpegMock = func<Sharp['jpeg']>();

            await replaceEsm('sharp', {
                default: () => ({
                    metadata: metadataMock,
                    jpeg: jpegMock,
                    toBuffer: toBufferMock,
                }),
            });

            service = await import('../../../src/services/photo.mjs');
        });

        it('should handle non-existing IDs', function () {
            const baseURL = 'https://localhost/';
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

            const svc = new PhotoService(baseURL, fetch);

            const expected = null;
            return expect(svc.downloadPhotoForFaceX(attachmentID)).to.become(expected);
        });

        const table = [
            [{ format: 'jpeg', chromaSubsampling: '4:2:0', isProgressive: false }, 0],
            [{ format: 'jpeg', chromaSubsampling: '4:2:0', isProgressive: true }, 1],
        ] as const;

        // eslint-disable-next-line mocha/no-setup-in-describe
        table.forEach(([metadata, jpegCalls]) => {
            it(`should return the photo (${JSON.stringify(metadata)})`, async function () {
                const baseURL = 'https://localhost/';
                const attachmentID = 123;
                const dbResponse = [{ att_id: 1, path: 'criminal/00/00/7b/xxx.jpg', mime_type: 'image/jpeg' }];
                const httpResponse = 'test';

                const tracker = mockKnex.getTracker();
                tracker.on('query', (query, step) => {
                    expect(step).to.equal(1);
                    query.response(dbResponse);
                });
                tracker.install();

                const svc = new service.PhotoService(baseURL, fetch);

                nock(`${baseURL}`).get(`/${dbResponse[0]!.path}`).reply(200, httpResponse);

                const expected = Buffer.from(httpResponse);
                when(metadataMock()).thenResolve(metadata);
                when(toBufferMock()).thenResolve(expected);

                const actual = await svc.downloadPhotoForFaceX(attachmentID);
                expect(actual).to.deep.equal(expected);
                verify(jpegMock(matchers.anything() as JpegOptions | undefined), { times: jpegCalls });
            });
        });

        it('should return null on failure', async function () {
            const baseURL = 'https://localhost/';
            const attachmentID = 123;
            const dbResponse = [{ att_id: 1, path: 'criminal/00/00/7b/xxx.jpg', mime_type: 'image/jpeg' }];
            const httpResponse = 'test';

            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                expect(step).to.equal(1);
                query.response(dbResponse);
            });
            tracker.install();

            const svc = new service.PhotoService(baseURL, fetch);

            nock(`${baseURL}`).get(`/${dbResponse[0]!.path}`).reply(200, httpResponse);

            when(metadataMock()).thenReject(new Error('test'));

            const expected = null;
            const actual = await svc.downloadPhotoForFaceX(attachmentID);
            expect(actual).to.equal(expected);

            verify(toBufferMock(matchers.anything() as (err: Error, buffer: Buffer, info: OutputInfo) => void), {
                times: 0,
            });
            verify(jpegMock(matchers.anything() as JpegOptions | undefined), { times: 0 });
        });
    });

    describe('#getPhotoToSync', function () {
        const baseURL = 'https://localhost/';

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

            const svc = new PhotoService(baseURL, fetch);

            const expected = null;
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

            const svc = new PhotoService(baseURL, fetch);

            const expected = {
                id: dbResponse[0]!.id,
                att_id: dbResponse[0]!.att_id,
                suspect_id: dbResponse[0]!.criminal_id,
                path: dbResponse[0]!.path,
                flag: dbResponse[0]!.flag,
                image: '',
            };

            return expect(svc.getPhotoToSync()).to.become(expected);
        });

        describe('ADD_PHOTO processing', function () {
            let metadataMock: TestDouble<Sharp['metadata']>;
            let toBufferMock: TestDouble<Sharp['toBuffer']>;
            let jpegMock: TestDouble<Sharp['jpeg']>;

            let service: typeof import('../../../src/services/photo.mjs');
            let svc: PhotoService;

            const httpResponse = 'test';
            let dbResponse: Record<string, unknown>[];

            before(function () {
                dbResponse = [
                    { id: 1, att_id: 2, criminal_id: 3, path: 'criminal/00/00/7b/xxx.jpg', flag: SyncFlag.ADD_PHOTO },
                ];

                metadataMock = func<Sharp['metadata']>();
                toBufferMock = func<Sharp['toBuffer']>();
                jpegMock = func<Sharp['jpeg']>();
            });

            beforeEach(async function () {
                when(metadataMock()).thenResolve({
                    format: 'jpeg',
                    chromaSubsampling: '4:2:0',
                    isProgressive: false,
                });

                await replaceEsm('sharp', {
                    default: () => ({
                        metadata: metadataMock,
                        toBuffer: toBufferMock,
                        jpeg: jpegMock,
                    }),
                });

                service = await import('../../../src/services/photo.mjs');

                const tracker = mockKnex.getTracker();
                tracker.on('query', (query, step) => {
                    checkQuery(query, step);
                    query.response(dbResponse);
                });
                tracker.install();

                svc = new service.PhotoService(baseURL, fetch);
            });

            it('should download the image', async function () {
                nock(`${baseURL}`).get(`/${dbResponse[0]!['path']}`).reply(200, httpResponse);
                when(toBufferMock()).thenResolve(Buffer.from(httpResponse));

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

                verify(jpegMock(matchers.anything() as JpegOptions | undefined), { times: 0 });
            });

            it('should return rmpty string if image download fails', async function () {
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

                verify(toBufferMock(), { times: 0 });
                verify(jpegMock(matchers.anything() as JpegOptions | undefined), { times: 0 });
            });

            it('should return empty string if image conversion fails', async function () {
                nock(`${baseURL}`).get(`/${dbResponse[0]!['path']}`).reply(200, httpResponse);
                when(metadataMock()).thenReject(new Error());

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

                verify(toBufferMock(), { times: 0 });
                verify(jpegMock(matchers.anything() as JpegOptions | undefined), { times: 0 });
            });
        });
    });

    describe('#markCriminalSynced', function () {
        it('should return the expected results', function () {
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

    describe('#setSyncStatus', function () {
        const id = 53;

        const table = [
            [true, { method: 'del', bindings: [id], step: 1 }],
            [false, { method: 'update', bindings: [id], step: 1 }],
        ] as const;

        // eslint-disable-next-line mocha/no-setup-in-describe
        table.forEach(([success, expectations]) => {
            it(`should return the expected results (success = ${success})`, function () {
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
