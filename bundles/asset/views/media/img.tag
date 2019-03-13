<media-img>
  <picture>
    <source each={ img, i in opts.img } media="(max-width: { img.max })" srcset={ this.media.url(opts.image, img.label) } />
    <img src={ this.media.url(opts.image, opts.label) || opts.fallback } class={ opts.class || opts.classes } />
  </picture>

  <script>
    // Add mixins
    this.mixin('media');
  </script>
</media-img>
