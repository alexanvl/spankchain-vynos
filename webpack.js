const path = require('path'),
  webpack = require('webpack'),
  DIST_PATH = path.resolve(__dirname, 'dist'),
  UglifyJSPlugin = require('uglifyjs-webpack-plugin'),
  CopyWebpackPlugin = require('copy-webpack-plugin')

require('dotenv').config({ path: '.env' });

let FRAME_URL = process.env.FRAME_URL || 'http://localhost:9090'

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
  RPC_URL = process.env.RPC_URL;

function webpackConfig (entry) {
  const config = {
    entry: entry,
    devtool: 'source-map',
    output: {
      filename: '[name].js',
      path: DIST_PATH
    },
    plugins: [
      new webpack.DefinePlugin({
        'window.RPC_URL': JSON.stringify(RPC_URL),
        'self.CONTRACT_ADDRESS': JSON.stringify(CONTRACT_ADDRESS),
        'process.env': {
          'NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'), // This has effect on the react lib size,
          'DEBUG': process.env.NODE_ENV !== 'production',
          'FRAME_URL': JSON.stringify(FRAME_URL)
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
          loaders: ['ts-loader']
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

  if (process.env.NODE_ENV === 'production') {
    config.plugins.push(new UglifyJSPlugin({
      parallel: true,
      uglifyOptions: {
        output: {
          comments: false,
          beautify: false
        }
      }
    }))
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
    replaceDependency(/Unidirectional\.json$/, 'vendor/@machinomy/contracts/dist/build/contracts/Unidirectional.json'),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'commons',
      filename: 'commons.js'
    }),
    new CopyWebpackPlugin([
      resolvePath('vynos/frame.html'),
      resolvePath('vynos/workerRunner.js'),
    ])
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
});

const HARNESS = webpackConfig({
  harness: resolvePath('harness/harness.ts')
});


module.exports.HARNESS = HARNESS;
module.exports.VYNOS_BACKGROUND = VYNOS_BACKGROUND;
module.exports.VYNOS_SDK = VYNOS_SDK;
