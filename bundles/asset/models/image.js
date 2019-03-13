// Require dependencies
const fs    = require('fs-extra');
const sharp = require('sharp');

// Require local class dependencies
const File = model('file');

/**
 * Create Image Model class
 */
class Image extends File {
  /**
   * Construct Image Model class
   */
  constructor(...args) {
    // Run super
    super(...args);

    // Bind public methods
    this.thumb = this.thumb.bind(this);
  }

  /**
   * Upload with buffer
   *
   * @param   {Buffer} buffer
   *
   * @returns {File}
   *
   * @async
   */
  async fromBuffer(...args) {
    const [buffer] = args;

    // Load Image
    const img  = sharp(buffer);
    const meta = await img.metadata();

    // Set extension and hash
    this.set('ext', meta.format);
    this.set('meta', meta);

    // Run super
    return await super.fromBuffer(...args);
  }

  /**
   * Upload from file
   *
   * @param  {String} location
   *
   * @return {File}
   *
   * @async
   */
  async fromFile(...args) {
    const [location] = args;

    // Load Image
    const img  = sharp(await fs.readFile(location));
    const meta = await img.metadata();

    // Set extension and hash
    this.set('ext', meta.format);
    this.set('meta', meta);

    // Run super
    return await super.fromFile(...args);
  }

  /**
   * Creates thumb
   *
   * @param {string} name
   *
   * @returns {string}
   *
   * @async
   */
  async thumb(name) {
    // Set local cache
    const local = `${global.appRoot}/data/cache/tmp`;

    // Ensure sync
    await fs.ensureDir(local);

    // Pull to dir
    await this.eden.register('asset.transport').pull(this, `${local}/${this.get('hash')}`);

    // Load Image
    const load = sharp(await fs.readFile(`${local}/${this.get('hash')}`));

    /**
     * Set save function
     */
    load.save = async () => {
      // Set thumbs
      const thumbs = this.get('thumbs') || {};

      // Set thumb
      let thumb  = thumbs && thumbs[name] ? thumbs[name] : false;

      // Save thumb
      await load.toFile(`${local}/${this.get('hash')}-${name}`);

      // Load meta
      let meta = sharp(await fs.readFile(`${local}/${this.get('hash')}-${name}`));

      // Set meta
      meta = await meta.metadata();

      // Set info
      thumb = {
        ext  : meta.format,
        meta,
        name,
      };

      // Add to thumbs
      thumbs[name] = thumb;

      // Set thumbs
      this.set('thumbs', thumbs);

      // Push to away
      await this.eden.register('asset.transport').push(this, `${local}/${this.get('hash')}-${name}`, name);

      // Unlink
      await fs.unlink(`${local}/${this.get('hash')}`);
      await fs.unlink(`${local}/${this.get('hash')}-${name}`);

      // Save this
      await this.save();
    };

    // Return sharp with save handler
    return load;
  }

  /**
   * Remove Image
   *
   * @returns {File}
   *
   * @async
   */
  async remove(...args) {
    // Await remove Image
    await this.eden.hook('remove.Image', this);

    // Set thumbs
    const thumbs = this.get('thumbs') || {};

    // Loop for transport
    for (const thumb of Object.values(thumbs)) {
      // try/catch
      try {
        // Await remove
        await this.eden.register('asset.transport').remove(this, `${thumb.name || thumb.label}.${thumb.ext}`);
      } catch (e) { console.log(e) }
    }

    // Run super
    return super.remove(...args);
  }

  /**
   * Sanitise Image
   *
   * @return {object} sanitised
   *
   * @async
   */
  async sanitise(...args) {
    // Check arguments
    if (args && args.length) {
      // Return sanitised with args
      return await super.__sanitiseModel(...args);
    }

    // Get initial sanitised
    const sanitised = await super.sanitise(...args);

    // Set thumbs
    sanitised.thumbs = this.get('thumbs') || {};

    // Get url for thumbs
    for (const thumb of Object.values(sanitised.thumbs)) {
      // Set thumb url
      thumb.url = await this.eden.register('asset.transport').url(this, (thumb.name || thumb.label));
    }

    // Return sanitised
    return sanitised;
  }
}

/**
 * Export Image Model class
 *
 * @type {Image}
 */
module.exports = Image;
