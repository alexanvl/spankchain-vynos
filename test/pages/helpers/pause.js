// Nightwatch funkiness: need to return `this` so you can chain calls

module.exports = {
  pause: function (time) {
    this.api.pause(time);

    return this;
  }
}