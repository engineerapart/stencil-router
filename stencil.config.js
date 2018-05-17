exports.config = {
  enableCache: false,
  namespace: 'stencilrouter',
  outputTargets: [
    { type: 'www', serviceWorker: false },
    { type: 'dist', serviceWorker: false },
  ],
  globalScript: 'src/global/router.ts'
};
