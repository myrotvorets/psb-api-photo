import { mock } from 'node:test';
import type { DownloadServiceInterface } from '../../../src/services/downloadserviceinterface.mjs';

export const downloadMock = mock.fn<DownloadServiceInterface['download']>();

export class FakeDownloadService implements DownloadServiceInterface {
    public baseURL;

    public constructor() {
        this.baseURL = process.env['PHOTOS_BASE_URL']!;
    }

    public download(
        ...params: Parameters<DownloadServiceInterface['download']>
    ): ReturnType<DownloadServiceInterface['download']> {
        return downloadMock(...params);
    }
}
