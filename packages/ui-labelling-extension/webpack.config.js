/* eslint-env node */
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/**
 * `npm run build   # => production`
 * `npm run dev     # => development + watch`
 */
module.exports = (_, argv) => ({
  mode: argv.mode === 'production' ? 'production' : 'development',

  /** One entry per extension script you care about. */
  entry: {
    content: path.resolve(__dirname, 'src/content.ts'),
    // popup:   path.resolve(__dirname, 'src/popup.tsx'),
    // background: path.resolve(__dirname, 'src/background.ts'),
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',      // content.js, popup.js …
    clean: true,                // wipe dist/ between builds
  },

  devtool: argv.mode === 'production' ? false : 'inline-source-map',

  resolve: {
    extensions: ['.ts', '.js'],
    /** Point webpack at the compiled JS of the shared lib. */
    alias: {
      'ui-labelling-shared': path.resolve(
        __dirname,
        '../ui-labelling-shared/dist/index.js'
      ),
    },
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/, // faster
      },
    ],
  },

  /** Copy static, untouched files straight into dist/. */
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'assets', to: 'assets', noErrorOnMissing: true },
      ],
    }),
  ],

  /** Content scripts run in the page context, so normal `web` target works. */
  target: 'web',
});
