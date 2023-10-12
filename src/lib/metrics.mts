/* c8 ignore start */
import { ValueType } from '@opentelemetry/api';
import type { Container } from './container.mjs';

type AsyncMetricOptions = Pick<Container, 'photoService' | 'meter'>;

export function initAsyncMetrics({ meter, photoService }: AsyncMetricOptions): void {
    const syncQueueStatsGauge = meter.createObservableGauge('psbapi.photosync.count', {
        description: 'Photo synchronization queue statistics',
        valueType: ValueType.INT,
    });

    meter.addBatchObservableCallback(
        async (result) => {
            try {
                const stats = await photoService.getDbSyncStats();
                result.observe(syncQueueStatsGauge, stats.photos_to_add, { type: 'add' });
                result.observe(syncQueueStatsGauge, stats.photos_to_del, { type: 'del' });
                result.observe(syncQueueStatsGauge, stats.photos_add_failed, { type: 'add_failed' });
                result.observe(syncQueueStatsGauge, stats.photos_del_failed, { type: 'del_failed' });
                result.observe(syncQueueStatsGauge, stats.suspects, { type: 'suspects' });
            } catch {
                // Do nothing for now
            }
        },
        [syncQueueStatsGauge],
    );
}

/* c8 ignore stop */
