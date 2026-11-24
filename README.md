# #399 base|head crops (the birds lit by the key)

Made in a cloud session with a bird variant of the clouds lane's crops tool (#390): T1's harness on headless
SwiftShader, both arms the same opening (seed 1, 960x600, afterglow), and a loose flock of five gulls placed ahead of
the held camera in both arms (a scratch twin of each ref's inkbirds.js, never deployed).

- gulls-40m: the flock 40 m ahead, 45 frames after it is placed.
- gulls-9m: the flock 9 m ahead, 20 frames after it is placed.

Result: **base and head are identical to the pixel in both** (crops.json: 0 changed pixels in every band). The tone
the head computes does change (crops.json headProbe/baseProbe, a bird's one tone, linear RGB):
base (0.068, 0.042, 0.095) -> head (0.080, 0.033, 0.040). The drawn bird, a light ink stroke on this sky, does not
show it.
