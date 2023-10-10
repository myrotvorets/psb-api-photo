/* c8 ignore start */
import { ValueType } from '@opentelemetry/api';
import { OpenTelemetryConfigurator, getExpressInstrumentations } from '@myrotvorets/opentelemetry-configurator';
import { KnexInstrumentation } from '@myrotvorets/opentelemetry-plugin-knex';

export const configurator = new OpenTelemetryConfigurator({
    serviceName: 'psb-api-photos',
    instrumentations: [...getExpressInstrumentations(), new KnexInstrumentation()],
});

configurator.start();

export const requestDurationHistogram = configurator.meter().createHistogram('psbapi.request.duration', {
    description: 'Measures the duration of requests.',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
});

/* c8 ignore stop */
