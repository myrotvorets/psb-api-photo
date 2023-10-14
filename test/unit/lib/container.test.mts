import { expect } from 'chai';
import { Logger } from '@myrotvorets/otel-utils';
import { container, initializeContainer } from '../../../src/lib/container.mjs';
import { CriminalAttachmentModel } from '../../../src/models/criminalattachment.mjs';
import { SyncModel } from '../../../src/models/sync.mjs';
import { PhotoService } from '../../../src/services/photoservice.mjs';
import { DownloadService } from '../../../src/services/downloadservice.mjs';
import { ImageService } from '../../../src/services/imageservice.mjs';

describe('Container', function () {
    beforeEach(function () {
        return container.dispose();
    });

    describe('initializeContainer', function () {
        it('should initialize the container', function () {
            const container = initializeContainer();

            expect(container.resolve('photoService')).to.be.an('object').that.is.instanceOf(PhotoService);
            expect(container.resolve('imageService')).to.be.an('object').that.is.instanceOf(ImageService);
            expect(container.resolve('downloadService')).to.be.an('object').that.is.instanceOf(DownloadService);

            expect(container.resolve('criminalAttachmentModel'))
                .to.be.an('object')
                .that.is.instanceOf(CriminalAttachmentModel);

            expect(container.resolve('syncModel')).to.be.an('object').that.is.instanceOf(SyncModel);

            expect(container.resolve('meter'))
                .to.be.an('object')
                .that.has.property('createMeter')
                .that.is.a('function');

            expect(container.resolve('environment'))
                .to.be.an('object')
                .that.has.property('NODE_ENV')
                .that.is.a('string');
        });
    });
});
