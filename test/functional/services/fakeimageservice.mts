import { type TestDouble, func } from 'testdouble';
import type { ImageServiceInterface } from '../../../src/services/imageserviceinterface.mjs';

export const toFaceXFormatMock: TestDouble<ImageServiceInterface['toFaceXFormat']> =
    func<ImageServiceInterface['toFaceXFormat']>();

export class FakeImageService implements ImageServiceInterface {
    public async toFaceXFormat(
        ...params: Parameters<ImageServiceInterface['toFaceXFormat']>
    ): ReturnType<ImageServiceInterface['toFaceXFormat']> {
        return toFaceXFormatMock(...params);
    }
}
