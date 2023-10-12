import { expect } from 'chai';
import { HttpError } from '../../../src/lib/httperror.mjs';

describe('HttpError', function () {
    describe('constructor', function () {
        it('should create an instance of HttpError', function () {
            const error = new HttpError(404);
            expect(error).to.be.an.instanceOf(HttpError);
        });

        it('should set the code property', function () {
            const error = new HttpError(404);
            expect(error).to.haveOwnProperty('code').that.equals(404);
        });

        it('should have standard properties', function () {
            const error = new HttpError(404);
            expect(error).to.have.property('name', 'HttpError');
            expect(error).to.have.property('message').that.is.a('string');
            expect(error).to.have.property('stack').that.is.a('string');
        });
    });
});
