/* c8 ignore start */
import { fetchBuilder } from 'fetch-retry-ts';
import origFetch from 'node-fetch';

export const fetch = fetchBuilder<typeof origFetch>(origFetch, {
    retries: 3,
    retryDelay: (attempt: number): number => Math.pow(2, attempt) * 500,
    retryOn: [502, 503, 504],
});
/* c8 ignore stop */
