const crypto = require('crypto');

class WorkerRunnerPlugin {
  constructor(options) {
    this.options = options;

    if (!this.options.contentScripts || !this.options.contentScripts.length || !this.options.filename) {
      throw new Error('contentScripts and filename are required.');
    }
  }


  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      const files = this.options.contentScripts.map((file) => {
        const match = Object.keys(compilation.assets).find((asset) => asset.match(file));

        if (!match) {
          throw new Error('No file found.');
        }

        return match
      });

      const workerSource = `
        self.window = self;
        ${files.map((file) => `self.importScripts('/${file}');`).join('\n')}
      `;

      const name = this.options.filename.split('.').map((part) => {
        if (part !== '[hash]') {
          return part;
        }

        return this.hashContents(workerSource)
      }).join('.');

      compilation.assets[name] = {
        source: () => workerSource,
        size: () => workerSource.length
      };

      if (this.options.replaceFilename === this.options.filename) {
        return callback();
      }

      Object.keys(compilation.assets).forEach((key) => {
        if (!this.options.replacer(key)) {
          return
        }

        const file = compilation.assets[key];
        const source = file.source().replace(this.options.replaceFilename, name);
        const hash = this.hashContents(source);
        const newName = this.replaceHashIfPresent(key, hash);

        if (newName !== key) {
          console.log(`Renamed ${key} to ${newName}.`);
        }

        file.source = () => source;
        file.length = () => source.length;
        compilation.assets[newName] = file;
        delete compilation.assets[key];
      });

      callback();
    });
  }

  hashContents(contents) {
    const algo = crypto.createHash('sha256');
    algo.update(contents);
    return algo.digest('hex').slice(0, 20);
  }

  replaceHashIfPresent(filename, hash) {
    const splits = filename.split('.');
    const splitRegex = /^([a-f\d]+)$/;

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];

      if (split.match(splitRegex)) {
        splits[i] = hash;
        break;
      }
    }

    return splits.join('.');
  }
}

module.exports = WorkerRunnerPlugin;
