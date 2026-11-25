  /* ---------------------------------------------------------------- colour */
  function s2l(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [s2l((n >> 16 & 255) / 255), s2l((n >> 8 & 255) / 255), s2l((n & 255) / 255)]; }
  function oklab2lin(L, a, b) {
    var l = L + 0.3963377774 * a + 0.2158037573 * b, m = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b;
    l = l * l * l; m = m * m * m; s = s * s * s;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }
  function lch(L, C, h, k) { var r = h * Math.PI / 180, c = oklab2lin(L, C * Math.cos(r), C * Math.sin(r)); k = k === undefined ? 1 : k; return [Math.max(c[0], 0) * k, Math.max(c[1], 0) * k, Math.max(c[2], 0) * k]; }
  function lab(L, C, h) { var r = h * Math.PI / 180; return [L, C * Math.cos(r), C * Math.sin(r)]; }

