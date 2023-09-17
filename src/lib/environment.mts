import { cleanEnv, port, str, url } from 'envalid';

export interface Environment {
    NODE_ENV: string;
    PORT: number;
    PHOTOS_BASE_URL: string;
}

let environ: Environment | null = null;

export function environment(reset = false): Environment {
    if (!environ || reset) {
        environ = cleanEnv(process.env, {
            NODE_ENV: str({ default: 'development' }),
            PORT: port({ default: 3000 }),
            PHOTOS_BASE_URL: url(),
        });
    }

    return environ;
}
