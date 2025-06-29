import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

register('ts-node/esm', pathToFileURL('./'));

use(chaiAsPromised);

const env = { ...process.env };
process.env = {
    NODE_ENV: 'test',
    OTEL_SDK_DISABLED: 'true',
    PHOTOS_BASE_URL: 'https://example.com/',
    MYSQL_DATABASE: 'fake',
};

/** @type {import('mocha').RootHookObject} */
export const mochaHooks = {
    afterAll() {
        process.env = { ...env };
    },
};
