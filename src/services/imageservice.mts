import sharp, { type Metadata, type Sharp } from 'sharp';
import type { ImageServiceInterface } from './imageserviceinterface.mjs';

export class ImageService implements ImageServiceInterface {
    public async toFaceXFormat(photo: ArrayBuffer): Promise<Buffer | null> {
        let img: Sharp;
        let metadata: Metadata;

        try {
            img = sharp(photo, { failOnError: false, sequentialRead: true });
            metadata = await img.metadata();
        } catch {
            return null;
        }

        const isJPEG = metadata.format === 'jpeg';
        const sf = metadata.chromaSubsampling;
        const isProgressive = !!metadata.isProgressive;
        const flag = !isJPEG || sf !== '4:2:0' || isProgressive;
        if (flag) {
            img.jpeg({
                progressive: false,
                chromaSubsampling: '4:2:0',
            });
        }

        return img.toBuffer();
    }
}
