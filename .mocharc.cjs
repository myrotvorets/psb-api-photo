/** @type {import('mocha').MochaOptions} */
module.exports = {
    recursive: true,
    extension: ['.test.mts'],
    'node-option': +process.versions.node.split('.')[0] > 20 ? ['loader=testdouble', 'loader=ts-node/esm', 'no-warnings'] : ['loader=ts-node/esm', 'loader=testdouble', 'no-warnings'],
    require: 'mocha.setup.mjs',
    reporter: 'mocha-multi',
    'reporter-option': [
        'spec=-',
        process.env.GITHUB_ACTIONS === 'true' ? 'mocha-reporter-gha=-' : null,
        process.env.SONARSCANNER === 'true' ? 'mocha-reporter-sonarqube=test-report.xml' : null,
    ].filter(Boolean),
}
