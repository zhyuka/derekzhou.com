// tools/visit/look-rule.mjs: what a first heading's look must keep, and how the looks are weighed (the hub's review
// of #312, Nov 23: the score, not a hand pick). The measures are looks.mjs's (its record: tools/visit/looks.json).
//   WORD_CAP  the most of the words' boxes a heading may put under cloud, in any of the three frames (a bright cloud
//             behind the light words is the worst case): a heading over it is never picked, and test/unit/ruler.mjs
//             fails a table whose heading is over it or was never measured
//   lookScore the look's part of the pick: the opening's feature in frame and left clear (the Milky Way at night, the
//             low sun or its glow at dawn and sunset), less the top band under cloud
export const WORD_CAP = 0.1, FEATURE_W = 0.5, TOP_W = 0.25;
export const lookScore = (l) => FEATURE_W * (l.galaxy + l.sun) / 2 - TOP_W * l.topCloud;
export const lookKey = (deg) => (deg === null ? 'own' : String(deg));
