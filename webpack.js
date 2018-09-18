const path = require('path'),
  webpack = require('webpack'),
  DIST_PATH = path.resolve(__dirname, 'dist'),
  UglifyJSPlugin = require('uglifyjs-webpack-plugin'),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  WorkerRunnerPlugin = require('./WorkerRunnerPlugin');

require('dotenv').config({ path: '.env' });

let FRAME_URL = process.env.FRAME_URL || 'http://localhost:9090'

let API_URL = process.env.API_URL || 'https://camsite-staging.spankdev.com/api'

let HUB_URL = process.env.HUB_URL || 'https://hub-staging.spankdev.com'

const NODE_ENV = process.env.NODE_ENV

const NETWORK_NAME = process.env.NETWORK_NAME || 'rinkeby'

function resolvePath(dir) {
  return path.resolve.apply(path, [__dirname].concat(dir.split('/')));
}

function replaceDependency(regex, replacement) {
  return new webpack.NormalModuleReplacementPlugin(regex, resolvePath(replacement));
}

function stubDependency(regex) {
  return replaceDependency(regex, 'stubs/stub.js')
}

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS,
  INGRID_ADDRESS = process.env.INGRID_ADDRESS,
  RPC_URL = process.env.RPC_URL;

if (!CONTRACT_ADDRESS || !INGRID_ADDRESS) {
  throw new Error('Refusing to build without a defined contract or Ingrid address.')
}

function webpackConfig(entry, hash = true) {
  const config = {
    mode: NODE_ENV === 'production' ? 'production' : 'development',
    entry: entry,
    devtool: 'source-map',
    output: {
      filename: (NODE_ENV === 'production' || NODE_ENV === 'staging') && hash ? '[name].[hash].js' : '[name].js',
      path: DIST_PATH
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          commons: {
            test: /node_modules/,
            chunks: 'initial',
            minChunks: 2
          }
        }
      },
      minimize: NODE_ENV === 'production'
    },
    plugins: [
      new webpack.DefinePlugin({
        'window.RPC_URL': JSON.stringify(RPC_URL),
        'process.env': {
          'NODE_ENV': JSON.stringify(NODE_ENV || 'development'), // This has effect on the react lib size,
          'DEBUG': NODE_ENV !== 'production',
          'FRAME_URL': JSON.stringify(FRAME_URL),
          'API_URL': JSON.stringify(API_URL),
          'NETWORK_NAME': JSON.stringify(NETWORK_NAME),
          'HUB_URL': JSON.stringify(HUB_URL),
          'CONTRACT_ADDRESS': JSON.stringify(CONTRACT_ADDRESS),
          'INGRID_ADDRESS': JSON.stringify(INGRID_ADDRESS)
        }
      })
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: [/node_modules/],
          loaders: ['ts-loader?configFile=tsconfig.json']
        },
        {
          enforce: 'pre',
          test: /\.js$/,
          exclude: [/node_modules/],
          loader: 'source-map-loader'
        },
        {
          test: /\.s?css$/i,
          exclude: [/node_modules/],
          use: [
            {
              loader: 'style-loader'
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
                importLoaders: 1,
                modules: true,
                camelCase: true,
                localIdentName: '[name]_[local]_[hash:base64:5]',
                minimize: false
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => ([
                  require('postcss-import')(),
                  // Following CSS Nesting Module Level 3: http://tabatkins.github.io/specs/css-nesting/
                  require('postcss-nesting')(),
                  //https://github.com/ai/browserslist
                  require('autoprefixer')({
                    browsers: ['last 2 versions', 'ie >= 9']
                  })
                ])
              }
            }
          ]
        },
        {
          test: /\.css$/i,
          exclude: [resolvePath('vynos'), resolvePath('harness')],
          use: [
            {
              loader: 'style-loader'
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
                importLoaders: 1,
                minimize: true
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => ([
                  require('postcss-import')({
                    //If you are using postcss-import v8.2.0 & postcss-loader v1.0.0 or later, this is unnecessary.
                    //addDependencyTo: webpack // Must be first item in list
                  }),
                  require('postcss-nesting')(),  // Following CSS Nesting Module Level 3: http://tabatkins.github.io/specs/css-nesting/
                  require('autoprefixer')({
                    browsers: ['last 2 versions', 'ie >= 9'] //https://github.com/ai/browserslist
                  })
                ])
              }
            }
          ]
        },
        {
          test: /\.(eot|woff|woff2|svg|ttf|png|otf)([\?]?.*)$/,
          loader: 'file-loader'
        }
      ]
    },
    node: {
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      module: 'empty'
    }
  };

  if (NODE_ENV === 'production') {
    config.optimization.minimizer = [new UglifyJSPlugin({
      parallel: true,
      uglifyOptions: {
        mangle: false,
        output: {
          comments: false,
          beautify: false
        },
        keep_fnames: true,
        keep_classnames: true
      }
    })]
  }

  return config
}

function vynosConfig(entry) {
  const config = webpackConfig(entry);

  config.plugins = config.plugins.concat([
    new webpack.IgnorePlugin(/^(pg|mongodb)$/), // ignore pg and mongo since we're using nedb
    stubDependency(/wordlists\/((chinese_(.*))|french|italian|japanese|korean|spanish)\.json$/),
    stubDependency(/^(request|xhr)$/),
    replaceDependency(/^unorm$/, 'stubs/unorm.js'),
    new webpack.HashedModuleIdsPlugin(),
    new HtmlWebpackPlugin({
      template: resolvePath('vynos/frame.html'),
      filename: 'frame.html',
      excludeChunks: ['worker']
    }),
    new WorkerRunnerPlugin(),
  ]);

  return config
}

const VYNOS_BACKGROUND = vynosConfig({
  frame: [
    resolvePath('vynos/frame.ts')
  ],
  worker: [
    resolvePath('vynos/worker.ts')
  ]
});

const VYNOS_SDK = webpackConfig({
  vynos: resolvePath('vynos/vynos.ts')
}, false);

const HARNESS = webpackConfig({
  harness: resolvePath('harness/harness.ts')
}, false);


module.exports.HARNESS = HARNESS;
module.exports.VYNOS_BACKGROUND = VYNOS_BACKGROUND;
module.exports.VYNOS_SDK = VYNOS_SDK;
