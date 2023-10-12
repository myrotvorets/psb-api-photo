import type { RequestInfo, RequestInit, Response } from 'node-fetch';
import { HttpError } from '../lib/httperror.mjs';
import type { DownloadServiceInterface } from './downloadserviceinterface.mjs';

export type FetchLike<
    Info extends RequestInfo = RequestInfo,
    Init extends RequestInit = RequestInit,
    Resp extends Response = Response,
> = (url: Info, init?: Init) => Promise<Resp>;

export class DownloadService implements DownloadServiceInterface {
    public constructor(
        public readonly baseURL: string,
        private readonly fetch: FetchLike,
    ) {}

    public async download(path: string): Promise<ArrayBuffer> {
        const url = new URL(path, this.baseURL);
        const response = await this.fetch(url.href);
        if (response.ok) {
            return response.arrayBuffer();
        }

        throw new HttpError(response.status);
    }
}
