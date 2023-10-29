import { readFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import sharp from 'sharp';
import { ImageService } from '../../../src/services/imageservice.mjs';

const thisDir = dirname(fileURLToPath(import.meta.url));
const files = [
    `${thisDir}/../../fixtures/sample.png`,
    `${thisDir}/../../fixtures/progressive.jpg`,
    `${thisDir}/../../fixtures/4-4-4.jpg`,
    `${thisDir}/../../fixtures/normal.jpg`,
];

describe('ImageService', function () {
    describe('#toFaceXFormat', function () {
        let buffers: ArrayBuffer[] = [];
        let service: ImageService;

        before(async function () {
            buffers = await Promise.all(files.map((file) => readFile(file)));
            service = new ImageService();
        });

        // eslint-disable-next-line mocha/no-setup-in-describe
        files.forEach((file, index) =>
            it(`should process ${basename(file)}`, async function () {
                const buffer = buffers[index]!;
                const output = await service.toFaceXFormat(buffer);
                expect(output).not.to.be.null;
                const meta = await sharp(output!).metadata();
                expect(meta).to.be.an('object').that.includes({
                    format: 'jpeg',
                    chromaSubsampling: '4:2:0',
                    isProgressive: false,
                });
            }),
        );

        it('should return null on invalid input', async function () {
            const buffer = await readFile(`${thisDir}/../../fixtures/test.txt`);
            const actual = await service.toFaceXFormat(buffer);
            expect(actual).to.be.null;
        });
    });
});
