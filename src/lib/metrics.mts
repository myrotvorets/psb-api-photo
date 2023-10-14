/* c8 ignore start */
import { ValueType } from '@opentelemetry/api';
import type { Container } from './container.mjs';

type AsyncMetricOptions = Pick<Container, 'photoService' | 'meter' | 'logger'>;

export function initAsyncMetrics({ logger, meter, photoService }: AsyncMetricOptions): void {
    meter
        .createObservableGauge('psbapi.photosync.count', {
            description: 'Photo synchronization queue statistics',
            valueType: ValueType.INT,
        })
        .addCallback(async (result) => {
            try {
                const stats = await photoService.getDbSyncStats();
                result.observe(stats.photos_to_add, { type: 'add' });
                result.observe(stats.photos_to_del, { type: 'del' });
                result.observe(stats.photos_add_failed, { type: 'add_failed' });
                result.observe(stats.photos_del_failed, { type: 'del_failed' });
                result.observe(stats.suspects, { type: 'suspects' });
            } catch (e) {
                logger.error(e?.toString() ?? 'Unknown error');
            }
        });
}

/* c8 ignore stop */
