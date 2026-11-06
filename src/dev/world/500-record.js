  /* ---------------------------------------------------------------- the record and the switches (E0: diag v2's engine side)
     data-dev-switch on <html> is a list of name=value pairs ("rec=1 course=1 ab=order"), written by the preview's and
     staging's own diag script before the world boots. The site never writes it, and nothing here reads the URL. With
     rec=1 the engine keeps a record of how it runs (design-v5 3.1, 3.6): every presented interval in units of the
     period, with the phase it fell in and the tags of the frame before (cpu, stage, sync, stream, gpu), the
     synchronous calls timed, the frame fence's lag, per-stage CPU a second, the boot's timeline, each script's
     evaluation, each program's link, each pipeline key's first use, objects made and freed and uploads from client
     memory after the world shows, the flips, input latency, the phone's raw and filtered orientation, the switches in
     force. (The shipped page: no switch is read and the record is never made.)
     (Fix 2) Every interval carries its phase: boot (until the world shows), dissolve (its first 2 s), steady, control
     (the world halted), resume (the 2 s after a hidden tab, an app switch or the control tail; the interval across the
     gap itself is never recorded) and resize (the second after a resize or a rotation). The gates' numbers (D1-D3:
     percentiles, histogram, misses, their tags, intervals over 3 kP) are steady flight's; the other phases are
     reported apart. The stage tag (3.1) now also takes the first use of a pipeline key (8.2's full key: program,
     vertex layout, topology, target formats and draw buffers, colour mask, blend, depth and cull state; its Metal part
     counted apart) and every GL object freed after the world shows (the fence ring's syncs exempt).
     The switches (3.6): live ones flip at once (order, fence, birds, stream); dpr1, wrap and course apply at boot; ab
     until the world shows; stats, march, ubo and worker are reserved names (their mechanisms arrive in E6, E7, E3a and
     E7) and are recorded but do nothing in E0. words=0 (dev) draws the world with the words' machinery off: W7's pair. */
