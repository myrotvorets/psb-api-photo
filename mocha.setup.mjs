import { use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { reset } from 'testdouble';

use(chaiAsPromised);
use(chaiSubset);

const env = { ...process.env };
process.env = {
    NODE_ENV: 'test',
    OTEL_SDK_DISABLED: 'true',
    PHOTOS_BASE_URL: 'https://example.com/',
    MYSQL_DATABASE: 'fake',
};

/** @type {import('mocha').RootHookObject} */
export const mochaHooks = {
    /** @returns {void} */
    afterEach() {
        reset();
    },
    afterAll() {
        process.env = { ...env };
    },
};
