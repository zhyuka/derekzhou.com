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
  var DAY = [['dawn', 5, 8, '#cdc9e6'], ['day', 8, 13, '#a5d5f8'], ['rain', 13, 16, '#9fbecd'], ['sunset', 16, 19, '#f4c1c6'], ['dusk', 19, 21, '#35304e'], ['night', 21, 29, '#282c3e']];
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
})();
