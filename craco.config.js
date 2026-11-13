
module.exports = {
  /* The heavy render suites (Settings Price List, Invoice, Insurance) take 10–25 s a file; under the full suite's parallel
     load single cases crossed jest's 5 s default and failed, then passed alone (3 Nov, five reruns). One limit for every
     suite, in line with the per-file jest.setTimeout the Invoice suites already carry. */
  jest: {
    configure: {
      testTimeout: 15000,
    },
  },
  babel: {
    plugins:
      process.env.NODE_ENV === 'production'
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : [],
  },
};
