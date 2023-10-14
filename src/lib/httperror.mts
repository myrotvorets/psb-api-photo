export class HttpError extends Error {
    public readonly code: number;
    public readonly url: URL;

    public constructor(code: number, url: URL, options?: ErrorOptions) {
        super(`HTTP Error ${code} retrieving ${url}`, options);
        this.name = 'HttpError';
        this.code = code;
        this.url = url;
    }
}
