// Create mixin
riot.mixin('media', {
  /**
   * On init function
   */
  init() {
    // Set media
    this.media = require('asset/public/js/media'); // eslint-disable-line global-require
  },
});
