/* eslint-disable no-empty */
// Require dependencies
const fs    = require('fs-extra');
const uuid  = require('uuid');
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

    // add debounced puller
    this.debounce = {};
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
    // from file
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
    const thId = uuid();
    const local = `${global.appRoot}/data/cache/tmp`;

    // Ensure sync
    await fs.ensureDir(local);

    // setup bounced out promise
    let reject = null;
    let resolve = null;
    const promise = new Promise((res, rej) => {
      reject = rej;
      resolve = res;
    });

    // big try/catch
    try {
      // do lock
      const lock = await this.eden.lock(`${this.get('_id')}:downloading`);

      // try/catch
      try {
        // pull to dir
        if (!Object.keys(this.debounce).length) {
          // Pull to dir
          await this.transport().pull(this, `${local}/${this.get('hash')}`);
        }

        // push debounced promise
        this.debounce[thId] = promise;
      } catch (e) {}

      // unlock
      lock();

      // Load Image
      const load = sharp(await fs.readFile(`${local}/${this.get('hash')}`));

      /**
       * Set save function
       */
      load.save = async () => {
        // Save thumb
        await load.toFile(`${local}/${this.get('hash')}-${name}`);

        // Load meta
        let meta = sharp(await fs.readFile(`${local}/${this.get('hash')}-${name}`));

        // Set meta
        meta = await meta.metadata();

        // Set thumbs
        this.set(`thumbs.${name}`, {
          ext  : meta.format,
          meta,
          name,
        });

        // Push to away
        await this.transport().push(this, `${local}/${this.get('hash')}-${name}`, name);

        // Unlink
        await fs.unlink(`${local}/${this.get('hash')}-${name}`);

        // Save this
        await this.save();

        // do lock
        const lock2 = await this.eden.lock(`${this.get('_id')}:downloading`);

        // try/catch
        try {
          // debounce
          delete this.debounce[thId];

          // check keys
          if (!Object.keys(this.debounce).length) {
            // unlink
            await fs.unlink(`${local}/${this.get('hash')}`);
          }
        } catch (e) {}

        // unlock
        lock2();
      };

      // Return sharp with save handler
      resolve(load);
    } catch (e) {
      // reject with error
      reject(e);
    }

    // return await
    return await promise;
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
        await this.transport().remove(this, (thumb.name || thumb.label));
      } catch (e) {}
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
      thumb.url = await this.transport().url(this, (thumb.name || thumb.label));
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
