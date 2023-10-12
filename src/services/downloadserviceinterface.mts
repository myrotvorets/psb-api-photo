export interface DownloadServiceInterface {
    readonly baseURL: string;
    download(path: string): Promise<ArrayBuffer>;
}
