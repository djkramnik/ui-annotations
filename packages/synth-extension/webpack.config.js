/* eslint-env node */
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/**
 * `npm run build`  -> production
 * `npm run dev`    -> development (watch)
 */
module.exports = (_, argv) => ({
  mode: argv.mode === 'production' ? 'production' : 'development',

  /** One entry per extension script. */
  entry: {
    // adjust names/paths only if your files differ
    content: path.resolve(__dirname, 'src/content.ts'),
    background: path.resolve(__dirname, 'src/background.ts'),
    'popup/popup': path.resolve(__dirname, 'src/popup/popup.ts'),
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',   // content.js, background.js, popup/popup.js
    clean: true,
  },

  // For dev, inline source maps are easiest to debug in Chrome
  devtool: argv.mode === 'production' ? false : 'inline-source-map',

  resolve: {
    extensions: ['.ts', '.js'],
    /**
     * If you are using a local workspace version of ui-labelling-shared,
     * uncomment the alias below and point it at the built JS.
     */
    // alias: {
    //   'ui-labelling-shared': path.resolve(__dirname, '../shared/dist/index.js'),
    // },
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          // Speeds up builds; set to 'diagnostics: true' if you want full type-checks here
          transpileOnly: true,
        },
      },
    ],
  },

  /**
   * Important for MV3: avoid code-splitting / runtime chunks that can break service workers
   * and content scripts unless you've wired chunk loading manually.
   */
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },

  plugins: [
    new CopyPlugin({
      patterns: [
        // Your MV3 manifest lives in public/
        { from: 'public/manifest.json', to: '.' },
        // Optional: any static assets/icons under public/assets
        { from: 'public/assets', to: 'assets', noErrorOnMissing: true },
        // Popup HTML
        { from: 'src/popup/index.html', to: 'popup/index.html' },
      ],
    }),
  ],

  /**
   * Content scripts run in the page context, popup runs in a document,
   * background is a service worker. Using 'web' here is fine across them;
   * if you hit service-worker quirks, set a separate config with target:'webworker'
   * just for background.
   */
  target: 'web',

  // Faster rebuilds in dev if you use `npm run dev`
  watchOptions: {
    ignored: /node_modules/,
  },
});
