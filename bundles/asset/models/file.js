// Require dependencies
const fs      = require('fs-extra');
const path    = require('path');
const request = require('request');
const url     = require('url');
const uuid    = require('uuid');

// Require local class dependencies
const Model = require('model');

/**
 * Create File Model Class
 */
class File extends Model {
  /**
   * Construct File Model class
   */
  constructor(...args) {
    // Run super
    super(...args);

    // Bind public methods
    this.url = this.url.bind(this);
    this.remove = this.remove.bind(this);
    this.sanitise = this.sanitise.bind(this);

    // Bind create methods
    this.fromURL = this.fromURL.bind(this);
    this.fromFile = this.fromFile.bind(this);
    this.fromBuffer = this.fromBuffer.bind(this);

    // Bind alias methods
    this.file = this.fromFile;
    this.buffer = this.fromBuffer;
    this.download = this.fromURL;
  }

  /**
   * Upload with buffer
   *
   * @param   {Buffer} buffer
   * @param   {string} name
   *
   * @returns {File}
   *
   * @async
   */
  async fromBuffer(buffer, name) {
    // Set extension and hash
    this.set('ext', this.get('ext') || path.extname(name).replace('.', ''));
    this.set('hash', this.get('hash') || uuid());

    // Ensure tmp dir
    fs.ensureDirSync(`${global.appRoot}/data/cache/tmp`);

    // Move File temporarily
    fs.writeFileSync(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`, buffer);

    // Return this for chainable
    await this.fromFile(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`, name);

    // Remove File
    fs.unlinkSync(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`);

    // Return this
    return this;
  }

  /**
   * Upload from url
   *
   * @param   {string} link
   *
   * @returns {File}
   *
   * @async
   */
  async fromURL(link) {
    // Get name
    const name = path.basename(url.parse(link).pathname);

    // Set extension and hash
    this.set('ext', this.get('ext') || path.extname(name).replace('.', ''));
    this.set('hash', this.get('hash') || uuid());

    // Ensure tmp dir
    fs.ensureDirSync(`${global.appRoot}/data/cache/tmp`);

    // Create request
    const res  = request.get(link);
    const dest = fs.createWriteStream(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`);

    // Res pipe dest
    res.pipe(dest);

    // Run Promise
    await new Promise((resolve) => {
      // Resolve on end
      res.on('end', resolve);
    });

    // Do File
    await this.fromFile(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`, name);

    // Remove File
    fs.unlinkSync(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`);

    // Return this
    return this;
  }

  /**
   * Upload from file
   *
   * @param   {string} location
   * @param   {string} name
   *
   * @returns {File}
   *
   * @async
   */
  async fromFile(location, name) {
    // Check if File exists
    if (!fs.existsSync(location)) {
      // Throw error
      throw new Error(`Image File does not exist in ${location}`);
    }

    // Set file info
    this.set('ext', this.get('ext') || path.extname(name).replace('.', ''));
    this.set('hash', this.get('hash') || uuid());
    this.set('name', name || (this.get('hash')) + this.get('ext'));
    this.set('size', fs.statSync(location).size);

    // Run file create hook
    await this.eden.hook('file.create', this, async () => {
      // Register asset transport
      await this.eden.register('asset.transport').push(this, location);

      // Save this
      await this.save();
    });

    // Return this
    return this;
  }

  /**
   * Remove image
   *
   * @returns {Model}
   */
  remove(...args) {
    // Run file remove hook
    return this.eden.hook('file.remove', this, async () => {
      // try/catch
      try {
        // Remove asset transport
        await this.eden.register('asset.transport').remove(this);
      } catch (e) { console.log(e) }

      // Remove this
      return super.remove(...args);
    });
  }

  /**
   * Gets image url
   *
   * @return {string}
   */
  url() {
    // Return asset transport url
    return this.eden.register('asset.transport').url(this);
  }

  /**
   * Sanitise image
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

    // Return sanitised with default
    return await super.__sanitiseModel('name', 'hash', 'created_at', {
      field          : '_id',
      sanitisedField : 'id',
      default        : null,
    }, {
      field  : 'url',
      custom : async () => {
        // Return url
        return await this.url();
      },
    });
  }
}

/**
 * Export File Model class
 *
 * @type {File}
 */
module.exports = File;
