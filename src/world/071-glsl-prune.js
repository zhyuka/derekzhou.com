  /* (load-perf, 2026-11-15: the serial-GPU boot) the text of a program's shader without the functions its main never
     reaches. Programs are joined at run time from the shared GLSL library, so each shader carried every function of the
     pieces it took: about half the batch's 430 KB never ran (the lab's phones compile the batch one program after another
     in the GPU process, 4.1-4.5 s on the A15, and every GPU job queues behind it; Chromium's compile and link of the
     pruned batch took about a quarter less). Only whole function definitions at the top level go; what is kept is the
     text as it was, byte for byte. Live: main, and every name in the text outside the definitions (globals, structs,
     blocks, #define bodies) and in the defines given before it (extra), then every name in a live function's
     definitions (all its overloads), to a fixed point. A name that is not a function is ignored; a definition that
     holds an unbalanced #if/#endif is kept. Deterministic: the same text in, the same text out */
  var PRUNE_ID = /[A-Za-z_]\w*/g, PRUNE_HEAD = /([A-Za-z_]\w*)\s*\(([^()]*)\)\s*$/, PRUNE_PP = /^[ \t]*#[ \t]*(if|ifdef|ifndef|endif)\b/gm;
  function pruneIds(t, out) { var m; PRUNE_ID.lastIndex = 0; while ((m = PRUNE_ID.exec(t))) out[m[0]] = 1; return out; }
  function pruneDefs(src) {   // the top-level function definitions: [{ name, a, b }] (src.slice(a, b) is the whole definition)
    var defs = [], n = src.length, i = 0, depth = 0, from = 0, open = -1, c, j, head, m, s;
    while (i < n) {
      c = src.charCodeAt(i);
      if (c === 47 && src.charCodeAt(i + 1) === 47) { j = src.indexOf('\n', i); i = j < 0 ? n : j; continue; }   // a // comment
      if (c === 47 && src.charCodeAt(i + 1) === 42) { j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; continue; }   // a /* */ comment
      if (c === 35 && depth === 0) {   // a preprocessor line at the top level (with its continuations): a boundary
        j = i; while (j > 0 && (src.charCodeAt(j - 1) === 32 || src.charCodeAt(j - 1) === 9)) j--;
        if (j === 0 || src.charCodeAt(j - 1) === 10) {
          while (i < n) { j = src.indexOf('\n', i); if (j < 0) { i = n; break; } if (src.charCodeAt(j - 1) !== 92) { i = j + 1; break; } i = j + 1; }
          from = i; continue;
        }
      }
      if (c === 123) { if (depth === 0) open = i; depth++; }
      else if (c === 125) {
        depth--;
        if (depth === 0 && open >= 0) {
          head = src.slice(from, open); m = PRUNE_HEAD.exec(head);
          if (m && head.indexOf('=') < 0 && !/\b(struct|uniform|buffer|in|out)\b\s*[A-Za-z_]\w*\s*$/.test(head.replace(PRUNE_HEAD, ''))) {
            s = from; while (s < open && /\s/.test(src[s])) s++;
            defs.push({ name: m[1], a: s, b: i + 1 });
          }
          open = -1; from = i + 1;
        }
      } else if (c === 59 && depth === 0) from = i + 1;
      i++;
    }
    return defs;
  }
  function pruneBalanced(t) { var d = 0, m; PRUNE_PP.lastIndex = 0; while ((m = PRUNE_PP.exec(t))) { d += m[1] === 'endif' ? -1 : 1; if (d < 0) return false; } return d === 0; }
  function glslPrune(src, extra) {
    if (!src || src.indexOf('main') < 0) return src;
    var defs = pruneDefs(src), by = {}, i, k, d, rest = '', at = 0;
    if (!defs.length) return src;
    for (i = 0; i < defs.length && defs[i].name !== 'main'; i++);
    if (i === defs.length) return src;   // (no main found at the top level: the text as it was)
    for (i = 0; i < defs.length; i++) { d = defs[i]; (by[d.name] = by[d.name] || []).push(d); rest += src.slice(at, d.a); at = d.b; }
    rest += src.slice(at);
    var seen = pruneIds(rest + '\n' + (extra || ''), {}), live = {}, q = ['main'];
    for (k in seen) if (by[k]) q.push(k);
    while (q.length) {
      k = q.pop(); if (live[k]) continue; live[k] = 1;
      for (i = 0; i < by[k].length; i++) { var ids = pruneIds(src.slice(by[k][i].a, by[k][i].b), {}); for (var x in ids) if (by[x] && !live[x]) q.push(x); }
    }
    var out = '', cut = 0; at = 0;
    for (i = 0; i < defs.length; i++) {
      d = defs[i];
      if (live[d.name] || !pruneBalanced(src.slice(d.a, d.b))) continue;
      out += src.slice(at, d.a); at = d.b; cut++;
    }
    return cut ? out + src.slice(at) : src;
  }
