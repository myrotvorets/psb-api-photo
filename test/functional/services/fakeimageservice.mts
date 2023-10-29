import { mock } from 'node:test';
import type { ImageServiceInterface } from '../../../src/services/imageserviceinterface.mjs';

export const toFaceXFormatMock = mock.fn<ImageServiceInterface['toFaceXFormat']>();

export class FakeImageService implements ImageServiceInterface {
    public async toFaceXFormat(
        ...params: Parameters<ImageServiceInterface['toFaceXFormat']>
    ): ReturnType<ImageServiceInterface['toFaceXFormat']> {
        return toFaceXFormatMock(...params);
    }
}
