/* The hour — which part of the day the sky opens on.

   The sky passes from sky to sky in an order of its own (the sky's
   script), but a visit opens on the visitor's own time of day: night
   21-05, dawn 05-08, day 08-13, rain 13-16, sunset 16-19, dusk 19-21.
   This reads the clock, once, here and nowhere else, and marks the page
   before its first paint: data-sky (which time of day: the stylesheet's
   still sky and its words' colours; the sky's script opens on one of its
   skies) and data-sky-at (how far through that time of day, 0-1: the
   first sky opens that far through its hold), and the browser's bars take
   the top of that still sky (theme-color). Without it the page is the
   still day sky. */
(function () {
  var d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  var DAY = [['dawn', 5, 8, '#173a63'], ['day', 8, 13, '#173a63'], ['rain', 13, 16, '#5f3d62'], ['sunset', 16, 19, '#5f3d62'], ['dusk', 19, 21, '#38396a'], ['night', 21, 29, '#17234f']];
  var i, a, b, at, meta = document.querySelector('meta[name="theme-color"]');
  if (h < 5) h += 24;
  for (i = 0; i < DAY.length; i++) {
    a = DAY[i][1]; b = DAY[i][2];
    if (h >= a && h < b) break;
  }
  if (i === DAY.length) i = DAY.length - 1;
  at = Math.min(0.999, Math.max(0, (h - DAY[i][1]) / (DAY[i][2] - DAY[i][1])));
  document.documentElement.setAttribute('data-sky', DAY[i][0]);
  document.documentElement.setAttribute('data-sky-at', at.toFixed(3));
  if (meta) meta.setAttribute('content', DAY[i][3]);      // (the browser's own bars, the top of that still sky)
  /* The opening: the visit's one draw of entropy (the world's weather) is made here, so the page can show that
     opening's still before its first paint. It picks one of the hour's N openings; data-seed is that opening's seed,
     which the world reads as its visit seed: it seeds everything after the opening too. The
     still is chosen by the window's shape (the world's frustum bands: portrait below h/w 1.893 the shorter still, above
     it the taller, landscape the narrower) and by the world's memory tier (lo: the phones the world gives its least
     memory, Android under 8 GB; hi: the rest), baked on the 4090 (tools/gpu/bake-stills.js) and put under
     /assets/still/ by the build. It is the body's ::before (the stylesheet), fetched at once by the preload in the head;
     the world cuts in over it, opening at the still's own view and settling to the window's own. */
  var N = 16, e = new Uint32Array(1), k = 0, nav2 = navigator, mm = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  try { crypto.getRandomValues(e); k = e[0] % N; } catch (x) { k = 0; }
  document.documentElement.setAttribute('data-seed', String((11 + k * 0x9e3779b9) >>> 0));
  var SHAPES = [['1000/2080', '393x861'], ['1000/1960', '393x817'], ['1000/1893', '393x770'], ['1000/1840', '393x724'], ['1000/1720', '393x676'], ['1000/1600', '393x629'], ['1000/1333', '393x524'],
    ['1249/1000', '1080x1080'], ['1599/1000', '1350x1080'], ['1777/1000', '1728x1080'], ['2099/1000', '1920x1080']], shape = '2268x1080', j;
  for (j = 0; j < SHAPES.length; j++) if (mm('(max-aspect-ratio: ' + SHAPES[j][0] + ')')) { shape = SHAPES[j][1]; break; }
  var touch = mm('(pointer: coarse)') || nav2.maxTouchPoints > 1;
  var tier = touch && !/iPhone|iPad|Macintosh/.test(nav2.userAgent || '') && (nav2.deviceMemory || 0) < 8 ? 'lo' : 'hi';
  var url = '/assets/still/' + DAY[i][0] + '-' + k + '-' + tier + '-' + shape + '.avif', pre = document.querySelector('link.still');
  document.documentElement.style.setProperty('--still', 'url("' + url + '")');
  if (pre) pre.href = url;
  /* (first-paint preview) the hold: the page's first paint waits for the world's first frame (the link rel=expect in
     the head). Where the odds are low it is taken out here, before the body, so the words paint as soon as they can:
     reduced motion (one still frame, today's path), forced colours, no WebGL2, 4 or fewer cores, under 8 GB where the
     browser says (deviceMemory), a hidden tab, and by the browser: Firefox (no parallel compiles), Safari and every
     WebKit (links one at a time; its deadline waits on a real Mac's film), every Android (its GPUs, Mali and Adreno,
     take 2-10 s) and iOS/iPadOS. The world checks the rest once it has its context, and holds only where it foretells
     the world within about a second (the owner's rule). */
  var hold = document.querySelector('link[rel="expect"][blocking="render"]');
  if (hold) {
    var nav = navigator, ua = nav.userAgent || '', mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
    if (mq('(prefers-reduced-motion: reduce)') || mq('(forced-colors: active)') || typeof WebGL2RenderingContext === 'undefined' ||
      (nav.hardwareConcurrency || 0) <= 4 || (nav.deviceMemory && nav.deviceMemory < 8) || document.visibilityState === 'hidden' ||
      /Firefox\/|Android|iPhone|iPad|iPod/.test(ua) || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua))) hold.remove();
  }
})();
