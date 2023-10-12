export class HttpError extends Error {
    public readonly code: number;

    public constructor(code: number, options?: ErrorOptions) {
        super(`HTTP Error ${code}`, options);
        this.name = 'HttpError';
        this.code = code;
    }
}
