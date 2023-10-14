import { expect } from 'chai';
import { HttpError } from '../../../src/lib/httperror.mjs';

describe('HttpError', function () {
    const expectedURL = new URL('http://example.com');
    const expectedCode = 404;
    const error = new HttpError(expectedCode, expectedURL);

    describe('constructor', function () {
        it('should create an instance of HttpError', function () {
            expect(error).to.be.an.instanceOf(HttpError);
        });

        it('should set the code property', function () {
            expect(error).to.haveOwnProperty('code').that.equals(expectedCode);
        });

        it('should set the url property', function () {
            expect(error).to.haveOwnProperty('url').that.deep.equals(expectedURL);
        });

        it('should have standard properties', function () {
            expect(error).to.have.property('name', 'HttpError');
            expect(error).to.have.property('message').that.is.a('string');
            expect(error).to.have.property('stack').that.is.a('string');
        });
    });
});
