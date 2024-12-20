/* eslint-disable sonarjs/assertions-in-tests */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import type { RequestListener } from 'node:http';
import { expect } from 'chai';
import express from 'express';
import request from 'supertest';
import * as knexpkg from 'knex';
import mockKnex from 'mock-knex';
import { buildKnexConfig } from '../../../src/knexfile.mjs';
import { healthChecker, monitoringController } from '../../../src/controllers/monitoring.mjs';

describe('MonitoringController', function () {
    let app: RequestListener;
    let db: knexpkg.Knex;

    before(function () {
        const application = express();
        application.disable('x-powered-by');

        const { knex } = knexpkg.default;
        db = knex(buildKnexConfig({ MYSQL_DATABASE: 'fake' }));
        mockKnex.mock(db);

        application.use('/monitoring', monitoringController(db));
        app = application as RequestListener;
    });

    after(function () {
        mockKnex.unmock(db);
    });

    afterEach(function () {
        process.removeAllListeners('SIGTERM');
        mockKnex.getTracker().uninstall();
        expect(healthChecker).not.to.be.undefined;
        healthChecker!.shutdownRequested = false;
    });

    const checker200 = (endpoint: string): Promise<unknown> =>
        request(app).get(`/monitoring/${endpoint}`).expect('Content-Type', /json/u).expect(200);

    const checker503 = (endpoint: string): Promise<unknown> => {
        expect(healthChecker).not.to.be.undefined;
        healthChecker!.shutdownRequested = true;
        return request(app).get(`/monitoring/${endpoint}`).expect('Content-Type', /json/u).expect(503);
    };

    describe('Liveness Check', function () {
        it('should succeed', function () {
            return checker200('live');
        });

        it('should fail when shutdown requested', function () {
            return checker503('live');
        });
    });

    describe('Readiness Check', function () {
        it('should succeed', function () {
            return checker200('ready');
        });

        it('should fail when shutdown requested', function () {
            return checker503('ready');
        });
    });

    describe('Health Check', function () {
        it('should succeed', function () {
            return checker200('health');
        });

        it('should fail when shutdown requested', function () {
            return checker503('health');
        });
    });
});
