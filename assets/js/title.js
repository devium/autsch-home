document.addEventListener('DOMContentLoaded', function() {
  const taglines = {{ .Site.Data.taglines | jsonify }};
  const tagline = taglines[Math.floor(Math.random() * taglines.length)];
  $('#tagline').text(tagline);
});
