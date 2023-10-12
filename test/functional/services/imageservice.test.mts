import { expect } from 'chai';
import { TestDouble, func, matchers, replaceEsm, verify, when } from 'testdouble';
import type { JpegOptions, Sharp } from 'sharp';

describe('ImageService', function () {
    describe('#toFaceXFormat', function () {
        let metadataMock: TestDouble<Sharp['metadata']>;
        let toBufferMock: TestDouble<Sharp['toBuffer']>;
        let jpegMock: TestDouble<Sharp['jpeg']>;

        let service: typeof import('../../../src/services/imageservice.mjs');

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

            service = await import('../../../src/services/imageservice.mjs');
        });

        const table = [
            [{ format: 'jpeg', chromaSubsampling: '4:2:0', isProgressive: false }, 0],
            [{ format: 'jpeg', chromaSubsampling: '4:2:0', isProgressive: true }, 1],
        ] as const;

        // eslint-disable-next-line mocha/no-setup-in-describe
        table.forEach(([metadata, jpegCalls]) => {
            it(`should return the photo (${JSON.stringify(metadata)})`, async function () {
                const expected = Buffer.from('test');
                when(metadataMock()).thenResolve(metadata);
                when(toBufferMock()).thenResolve(expected);

                const svc = new service.ImageService();
                const actual = await svc.toFaceXFormat(Buffer.from(''));
                expect(actual).to.deep.equal(expected);

                verify(jpegMock(matchers.anything() as JpegOptions | undefined), { times: jpegCalls });
            });
        });

        it('should return null on failure', async function () {
            when(metadataMock()).thenReject(new Error('test'));

            const expected = null;
            const svc = new service.ImageService();
            const actual = await svc.toFaceXFormat(Buffer.from(''));
            expect(actual).to.equal(expected);

            verify(toBufferMock(matchers.anything() as Parameters<Sharp['toBuffer']>[0]), {
                times: 0,
            });
            verify(jpegMock(matchers.anything() as JpegOptions | undefined), { times: 0 });
        });
    });
});
