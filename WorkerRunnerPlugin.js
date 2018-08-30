const WORKER_FILE_REGEX = /^worker(\.)?([\w\d]+)?\.js$/i;
const COMMONS_FILE_REGEX = /^commons~frame~worker(\.)?([\w\d]+)?\.js$/i;
const FRAME_FILE_REGEX = /^frame(\.)?([\w\d]+)?\.js$/i;

class WorkerRunnerPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('WorkerRunnerPlugin', (compilation, callback) => {
      const filenames = [];
      let frameFilename = '';
      for (let name in compilation.assets) {
        if (!compilation.assets.hasOwnProperty(name)) {
          continue;
        }

        if (name.match(WORKER_FILE_REGEX) || name.match(COMMONS_FILE_REGEX)) {
          filenames.push(name);
        } else if (name.match(FRAME_FILE_REGEX)) {
            frameFilename = name;
        }
      }

      if (!filenames.length || !frameFilename) {
        return callback(new Error('required file not found'));
      }

      let source = `self.XMLHttpRequest = {};\nself.window = self;\n`;
      source += filenames.map((name) => `self.importScripts('/${name}');`).join('\n');
      const split = filenames[0].split('.');
      const sha = split.length === 3 ? split[split.length - 2] : null;
      const workerRunnerFile = sha ? `workerRunner.${sha}.js` : 'workerRunner.js';

      compilation.assets[workerRunnerFile] = {
        source() {
          return source;
        },
        size() {
          return source.length;
        }
      };

      const originalAsset = compilation.assets[frameFilename];
      const originalSource = originalAsset.source();
      const newSource = sha ? originalSource.replace(/\/workerRunner\.js/g, workerRunnerFile) : originalSource;
      compilation.assets[frameFilename] = {
        source() {
          return newSource
        },
        size() {
          return newSource.length;
        }
      };

      callback();
    });
  }
}

module.exports = WorkerRunnerPlugin;
