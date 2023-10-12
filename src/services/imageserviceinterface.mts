export interface ImageServiceInterface {
    toFaceXFormat(photo: ArrayBuffer): Promise<Buffer | null>;
}
