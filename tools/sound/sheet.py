#!/usr/bin/env python3
"""The score's sample sheet: every note the sound icon's score plays, from real recordings, in one stereo MP3.

Run by hand when the notes change (not in CI): python3 tools/sound/sheet.py VSCO VCSL
  VSCO  a checkout of VS Chamber Orchestra: Community Edition (CC0; VSCO-2-CE on GitHub)
  VCSL  a checkout of the Versilian Community Sample Library (CC0; VCSL on GitHub)
Needs numpy and ffmpeg (libmp3lame). Writes site/assets/sound/notes-N.mp3 (N from the SHEET line in src/sound.js, plus
one: a changed file is a new name, changed-bytes-new-name; the old file removed), rewrites that SHEET line, and rewrites
the NOTES line in src/score.js (the index: instrument, pitch, start, length, loops, gain).

What it does, note by note (the same as the sketches the owner chose, round seventeen):
  - the note's own pitch (VSCO names its notes an octave under their sound, but not its harp; VCSL names them right);
  - the silence before it cut; a low-pass at the instrument's cutoff and a soft high shelf (darker, never brighter);
  - its level read as the sketches read it (the RMS from 0.3 s to 2 s), kept as a gain in the index;
  - a sustained note (strings, clarinet, horn, contrabass, tuba): 0.5 s in, past the attack (the score swells every
    sustained note in over seconds), a loop of LOOP s with the 0.6 s before it crossfaded into its end, so it plays
    on with no seam; a harp or piano note: from its start, with its own decay, the last 0.5 s faded;
  - each peak-scaled for the MP3, its gain in the index undoing that.
The sheet opens with one click at 0.2 s, so the score finds where the decoder put time zero (MP3 decoders differ by
a few milliseconds), then 0.3 s of silence; 0.15 s of silence between notes. 24 kHz: nothing in the score is above
about 4 kHz. Stereo: the sections' own width, as recorded (a mono sheet made them points).
"""
import json, os, re, subprocess, sys
import numpy as np

SR = 24000
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NAMES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
# (instrument: folder, file pattern, octave offset, low-pass Hz, high shelf dB, the pitches kept, loop s or 0 for one-shot, one-shot s)
INST = [
    ('cello', 'V', 'Strings/Cello Section/susvib', r'susvib_([A-G]#?\d)_v1_1\.wav', 12, 2300, -3, [36, 40, 43, 47, 50, 53], 5.0, 0),
    ('viola', 'V', 'Strings/Viola Section/susvib', r'ViolaEns_susvib_([A-G]#?\d)_v1_1\.wav', 12, 2500, -4, [55, 59, 62], 5.0, 0),
    ('violin', 'V', 'Strings/Violin Section/susVib', r'VlnEns_susVib_([A-G]#?\d)_v1\.wav', 12, 2600, -5, [62, 66, 69, 72, 76], 5.0, 0),
    ('clar', 'V', 'Woodwinds/Clarinet/susLong', r'DCClar_susLong_([A-G]#?\d)_v1_rr1_sum\.wav', 12, 2600, -4, [58, 62, 65, 70, 74, 77], 4.0, 0),
    ('horn', 'V', 'Brass/F Horn/sus', r'MOHorn_sus_([A-G]#?\d)_v1_1\.wav', 12, 1800, -5, [43, 46, 50, 53, 57, 60, 74], 4.0, 0),
    ('cbass', 'V', 'Strings/Solo Contrabass/SusNV', r'BKCtbss_SusNV_([A-G]#?\d)_v1_rr1\.wav', 12, 800, -8, [28, 30, 31, 34], 4.0, 0),
    ('tuba', 'V', 'Brass/Tuba/sus', r'Tuba3_sus_([A-G]#?\d)_v1_rr1_Mid\.wav', 12, 900, -8, [41, 50], 4.0, 0),
    ('harp', 'V', 'Strings/Harp', r'KSHarp_([A-G]#?\d)_m[fp]\.wav', 0, 2800, -5, [41, 45, 48, 52, 55, 59, 62, 65, 69, 72, 76, 79, 83, 86], 0, 4.5),
    ('piano', 'P', 'Chordophones/Zithers/Grand Piano, Steinway B/Sus', r'JHPiano_Sus_Close_([A-G]#?\d)_vl2_rr1\.wav', 0, 2400, -6, [36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84], 0, 6.0),
]
XF = 0.6

def midi(n):
    m = re.fullmatch(r'([A-G]#?)(-?\d)', n); return 12 * (int(m.group(2)) + 1) + NAMES[m.group(1)]
def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, 2).T.copy()
def eq(x, lp, shelf):
    n = x.shape[1] + SR; F = np.maximum(np.fft.rfftfreq(n, 1 / SR), 1.0)
    g = (1 / np.sqrt(1 + (F / lp) ** 4)) * 10 ** (shelf / 20 * (1 / (1 + (3000 / F) ** 2)))
    return np.fft.irfft(np.fft.rfft(x, n, axis=1) * g, n, axis=1)[:, :x.shape[1]]

def main(vsco, vcsl):
    base = {'V': vsco, 'P': vcsl}; parts = []; index = []
    head = np.zeros((2, int(0.5 * SR))); head[:, int(0.2 * SR)] = 0.9; parts.append(head); at = head.shape[1] / SR
    gap = np.zeros((2, int(0.15 * SR)))
    for name, lib, folder, pat, off, lp, shelf, keep, loop, one in INST:
        d = os.path.join(base[lib], folder); files = {}
        for f in sorted(os.listdir(d)):
            g = re.fullmatch(pat, f)
            if g and midi(g.group(1)) + off not in files: files[midi(g.group(1)) + off] = os.path.join(d, f)
        for m in keep:
            x = load(files[m]); a = int(np.argmax(np.abs(x).max(0) > 0.002 * np.abs(x).max())); x = eq(x[:, max(0, a - 2):], lp, shelf)
            rms = np.sqrt(np.mean(x[:, int(0.3 * SR):int(2.0 * SR)] ** 2)) + 1e-12
            if loop:
                a0, L, X = int(0.5 * SR) + int(XF * SR), int(loop * SR), int(XF * SR)
                assert x.shape[1] >= a0 + L, (name, m, x.shape[1] / SR)
                body = x[:, a0:a0 + L].copy(); pre = x[:, a0 - X:a0]; t = np.linspace(0, np.pi / 2, X)
                body[:, L - X:] = body[:, L - X:] * np.cos(t) + pre * np.sin(t)   # (the end runs into what comes just before the start: no seam)
                y = body
            else:
                y = x[:, :int(one * SR)].copy(); k = int(0.5 * SR); y[:, -k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
            pk = np.abs(y).max(); y = y / pk * 0.89
            gain = (0.05 / rms) * pk / 0.89   # (the sketches' level: RMS-normalised to 0.05; this undoes the peak scaling)
            index.append([name, m, round(at, 4), round(y.shape[1] / SR, 4), 1 if loop else 0, round(float(gain), 5)])
            parts.append(y); parts.append(gap); at += (y.shape[1] + gap.shape[1]) / SR
    sheet = np.concatenate(parts, axis=1).astype(np.float32)
    snd = open(os.path.join(ROOT, 'src/sound.js')).read(); sco = open(os.path.join(ROOT, 'src/score.js')).read()
    old = re.search(r"var SHEET = '/assets/sound/notes-(\d+)\.mp3';", snd); n = int(old.group(1)) + 1
    out = os.path.join(ROOT, 'site/assets/sound/notes-%d.mp3' % n)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', str(SR), out], input=sheet.T.tobytes(), check=True)
    prev = os.path.join(ROOT, 'site/assets/sound/notes-%d.mp3' % (n - 1))
    if os.path.exists(prev): os.remove(prev)
    names = [i[0] for i in INST]
    snd = snd.replace(old.group(0), "var SHEET = '/assets/sound/notes-%d.mp3';" % n)
    notes = json.dumps([[names.index(e[0])] + e[1:] for e in index], separators=(',', ':'))
    sco, k = re.subn(r"  var NOTES = \[\[.*?\]\], MARK = 0\.2;", lambda _: "  var NOTES = %s, MARK = 0.2;" % notes, sco, count=1)
    assert k == 1, 'no NOTES line in src/score.js'
    open(os.path.join(ROOT, 'src/sound.js'), 'w').write(snd); open(os.path.join(ROOT, 'src/score.js'), 'w').write(sco)
    print(json.dumps({'file': out, 'bytes': os.path.getsize(out), 'seconds': round(sheet.shape[1] / SR, 1), 'notes': len(index)}))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
