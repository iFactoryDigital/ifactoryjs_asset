// require store
const store = require('default/public/js/store');

/**
 * Create Media class
 */
class Media {
  /**
   * Construct Media class
   */
  constructor() {
    // Bind public methods
    this.url = this.url.bind(this);
  }

  /**
   * Get url for image and label
   *
   * @param   {object} image
   * @param   {string} label
   *
   * @returns {string}
   */
  url(image, label) {
    // Check image
    if (!image) return null;

    // Build url
    return label && image.thumbs[label] ? image.thumbs[label].url : image.url;
  }
}

/**
 * Set window's new Alert instance
 *
 * @type {Alert}
 */
window.eden.media = new Media();

/**
 * Export Alert instance
 *
 * @type {Alert}
 */
exports = module.exports = window.eden.media;