import { expect } from 'chai';
import nock, { type Scope } from 'nock';
import { DownloadService } from '../../../src/services/downloadservice.mjs';
import { fetch } from '../../../src/lib/fetch.mjs';
import { HttpError } from '../../../src/lib/httperror.mjs';

describe('DownloadService', function () {
    const BASE_URL = 'https://example.com';
    let scope: Scope;
    let svc: DownloadService;

    before(function () {
        nock.disableNetConnect();
        scope = nock(BASE_URL);
        svc = new DownloadService(BASE_URL, fetch);
    });

    after(function () {
        nock.enableNetConnect();
    });

    it('should be able to download files', function () {
        const response = 'Beam me up, Scotty!';
        const expected = new Uint8Array(Buffer.from(response, 'utf-8')).buffer;
        const path = '/foo';

        scope.get(path).reply(200, response);
        return expect(svc.download(path)).to.become(expected);
    });

    it('should throw a HttpError on non-200 response', function () {
        const path = '/foo';

        scope.get(path).reply(404);
        return expect(svc.download(path)).to.be.rejectedWith(HttpError);
    });
});
