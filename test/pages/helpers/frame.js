// Nightwatch funkiness: need to return `this` so you can chain calls

module.exports = {
  frame: function (id, cb) {
    this.api.frame(id, cb);

    return this;
  }
}