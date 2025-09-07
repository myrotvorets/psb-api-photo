export interface ImageServiceInterface {
    toFaceXFormat(photo: Buffer): Promise<Buffer | null>;
}
