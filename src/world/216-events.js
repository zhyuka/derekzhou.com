  /* ---------------------------------------------------------------- the events: rare sights, placed */
  /* (physics: air/events) The sights a visit may come on (a pool of fog in a hollow on a still night, a murmuration
     at dusk): each is a site on the ground, placed once by where it is, never by when or by the way flown, so two
     visits of the same read flown two ways meet the same sites where their paths cross them (path-independent). Each
     tier of rarity is a hex lattice of its own (EV_TIERS: about 8, 19 and 43 km between sites), one site a cell,
     jittered within a disc of EV_JIT of the spacing about the cell's centre, its kind drawn from the tier's kinds.
     The rarer two tiers are the rare ones: at most one rare site is in reach (EV_REACH) anywhere, since the lattice
     keeps a tier's sites (1 - 2 EV_JIT) of its spacing apart (over twice the reach) and a rare site yields to a rarer
     one within twice the reach. The sites are the read's own (SEEDR's stream, salt 0xE7): none before the cut (on
     screen at the cut is the opening's), and none within EV_CLEAR of the landing (where the opening is flown).
     A site only says where and what; its reader (LAND's fog pools, BIRDS' murmuration) decides when it shows, by the
     air (WORLD.air.wx, the sky). eventsNear(x, z, r) lists the sites within r m, nearest first (EVAPI, WORLD.events).
     A fog pool (kind 'fogpool'): the visit's mist drained into one hollow. On a calm clear night the cooled air on the
     slopes runs down into the low ground and fills it "much like streams filling a lake", so radiation fog is thickest
     in valleys and basins (https://mountwashington.org/?p=8735, https://www.weather.gov/safety/fog-radiation). The
     site carries its basin's radius (r, EV_POOL.r m) and the ring it drains (EV_POOL.catch times r): the mist layer
     over that whole ring, gathered into the basin, stands catch^2 times as deep there as the mist on the flats, up to
     EV_POOL.top (the pool's top held at about 145 m in the measured valley, its typical greatest depth there).
     evPoolDepth(site, mist) is that depth for the mist the air gives now (WORLD.air.wx(t).mist), so the pool comes
     and goes with the one mist (no clock or gate of its own: no mist, no pool); its reader (LAND) fills the lowest
     ground within r of the site to that depth, held under the basin's own rim */
  var EV_TIERS = [{ name: 'common', D: 8000, kinds: ['fogpool'] }, { name: 'uncommon', D: 19000, kinds: ['murmuration'] }, { name: 'rare', D: 43000, kinds: [] }];
  var EV_POOL = { r: [500, 900], catch: 2, top: 145 };   // (a fog pool: its basin's radius m, the ring it drains as a multiple of it, its greatest depth m)
  var EV_JIT = 0.24, EV_REACH = 4000, EV_CLEAR = 6000, EV_SALT = 0xE7, EV_S3 = Math.sqrt(3);
  function evSeed() { return AFTER ? subseed(SEEDR, EV_SALT) >>> 0 : null; }   // (the read's own, after the cut; before it, none)
  function evAxial(x, z, D) {   // the hex cell (axial q, r) holding (x, z), pointy-top, spacing D between centres
    var sz = D / EV_S3, cx = (x * EV_S3 / 3 - z / 3) / sz, cz = (z * 2 / 3) / sz, cy = -cx - cz, rx = Math.round(cx), rz = Math.round(cz), ry = Math.round(cy);
    var dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy <= dz) rz = -rx - ry;
    return [rx, rz];
  }
  function evCentre(q, r, D) { var s = D / EV_S3; return [s * EV_S3 * (q + r / 2), s * 1.5 * r]; }   // (centres D apart)
  function evSite(seed, ti, q, r) {   // the site of tier ti's cell (q, r), or null (none in the cell, or too near the landing)
    var T = EV_TIERS[ti]; if (!T.kinds.length) return null;
    var h = ihash2((q + 0x8000) ^ (ti << 20), (r + 0x8000) ^ ihash(seed)), a = hfl(h) * 2 * PI, k = Math.sqrt(hfl(ihash(h + 1))) * EV_JIT * T.D, c = evCentre(q, r, T.D);
    var x = c[0] + Math.cos(a) * k, z = c[1] + Math.sin(a) * k;
    if (x * x + z * z < EV_CLEAR * EV_CLEAR) return null;
    var s = { tier: ti, kind: T.kinds[Math.floor(hfl(ihash(h + 2)) * T.kinds.length)], x: x, z: z, id: ti + ':' + q + ':' + r };
    if (s.kind === 'fogpool') s.r = EV_POOL.r[0] + (EV_POOL.r[1] - EV_POOL.r[0]) * hfl(ihash(h + 3));
    return s;
  }
  function evTier(seed, ti, x, z, R, out) {   // tier ti's sites within R of (x, z)
    var D = EV_TIERS[ti].D, c = evAxial(x, z, D), n = Math.ceil(R / D) + 1, i, j, s, dx, dz;
    for (i = -n; i <= n; i++) for (j = -n; j <= n; j++) {
      s = evSite(seed, ti, c[0] + i, c[1] + j); if (!s) continue;
      dx = s.x - x; dz = s.z - z; s.d = Math.sqrt(dx * dx + dz * dz); if (s.d <= R) out.push(s);
    }
    return out;
  }
  function evYields(seed, s) {   // a rare site yields to a rarer one within twice the reach (so at most one rare site is in reach)
    for (var ti = s.tier + 1; ti < EV_TIERS.length; ti++) if (evTier(seed, ti, s.x, s.z, 2 * EV_REACH, []).length) return true;
    return false;
  }
  function eventsNear(x, z, r) {   // the sites within r m of (x, z), nearest first: [{ tier, kind, x, z, id, d }] (a fresh list)
    var seed = evSeed(), out = [], ti, all; if (seed === null) return out;
    for (ti = 0; ti < EV_TIERS.length; ti++) { all = evTier(seed, ti, x, z, r, []); for (var i = 0; i < all.length; i++) if (ti === 0 || !evYields(seed, all[i])) out.push(all[i]); }
    out.sort(function (a, b) { return a.d - b.d || a.tier - b.tier; });
    return out;
  }
  function evPoolDepth(s, mist) {   // a fog pool's depth over its basin's floor, m: the mist over the ring it drains, gathered in (0 with no mist)
    return s && s.kind === 'fogpool' && mist > 0 ? Math.min(EV_POOL.top, mist * EV_POOL.catch * EV_POOL.catch) : 0;
  }
  var EVAPI = { near: eventsNear, poolDepth: evPoolDepth, POOL: { r: EV_POOL.r.slice(), catch: EV_POOL.catch, top: EV_POOL.top }, REACH: EV_REACH, TIERS: EV_TIERS.map(function (T) { return { name: T.name, D: T.D, kinds: T.kinds.slice() }; }) };
