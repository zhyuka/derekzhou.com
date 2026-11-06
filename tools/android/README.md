# tools/android: the Android lab

Times the site's boot on real Android phones in Firebase Test Lab (the free Spark plan: 5 physical-device runs and
10 virtual ones a day). The lab is not part of the site's build or deploy and serves nothing.

Two APKs, no test libraries. Each run is one arm, and each arm makes a cold visit and then a return visit:

- `app/`: the WebView app (`com.derekzhou.lab`). It is a bare WebView in its own process, standing in for an app's
  in-app browser. It reads the probe's on-screen readout every second with `evaluateJavascript` and writes it to
  `wv-cold.txt` / `wv-return.txt`.
- `lab/`: the runner (`com.derekzhou.lab.test`). It is a plain `Instrumentation` that speaks `am instrument`'s status
  protocol, so Test Lab sees two tests, `Arms#chrome` and `Arms#webview`.
  - **chrome**: clears Chrome's data, gets past the first-run screens on the new-tab page, then opens the URL by
    intent. After the cold visit it force-stops Chrome, which keeps the disk caches, and opens the URL again.
  - **webview**: starts the app and later ends its `:web` process, then starts it again.
  - Both: screenshots at 0.5 to 16 s. The readout is read at 20 s, 60 s, 2 min, 5 min and the end. In Chrome it is
    read through accessibility, switched on only for that moment so Chrome builds no accessibility tree while the
    page boots.
  - Both: the device's GPU (SurfaceFlinger's GLES line), SoC, cores and memory go first in the log.
  - Test Lab turns the animation scales off, and the browser reports that as reduced motion. The runner turns them
    back on before the visits.

The readout comes from the probe previews (a claude/wk-probe-* branch's `probe.js`): first paint, the boot marks,
WORLD SHOWN, long frames, fps, the governor's rung, the compile path, whether the parallel-compile extension is there,
and the renderer. On Android, the readout's browser label and its cache line are not reliable (it says "Safari" in a
WebView, and WARM on a WebView's first visit).

## Build (WSL Ubuntu, or any Linux)

JDK 17, a system Gradle 8.10, and the Android command-line tools with `platforms;android-34` and
`build-tools;34.0.0`. No wrapper is committed.

```bash
export ANDROID_HOME=/opt/android JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
cd tools/android && /opt/gradle-8.10.2/bin/gradle --no-daemon :app:assembleDebug :lab:assembleDebug
```

## Run

You need `gcloud auth login` once, then `gcloud config set project <the lab's project>`. `--environment-variables`
reaches the runner as `url`, `cold` (seconds, default 75) and `hold` (the return visit's seconds, default 600).

```bash
gcloud firebase test android run --type instrumentation \
  --app app/build/outputs/apk/debug/app-debug.apk --test lab/build/outputs/apk/debug/lab-debug.apk \
  --test-targets "class com.derekzhou.lab.test.Arms#chrome" --device model=a15,version=34 \
  --environment-variables url=https://claude-wk-probe-main.derekzhou.pages.dev/,cold=75,hold=600 \
  --directories-to-pull /sdcard/Android/data/com.derekzhou.lab/files --timeout 15m --no-auto-google-login
```

- Use `Arms#webview` for the WebView arm.
- Check the harness on a virtual device first (`model=MediumPhone.arm`), which uses the free virtual quota. It has
  SwiftShader, so it never shows the world.
- On Windows, call gcloud through its bundled Python: `gcloud.cmd` breaks on its install path's space when an
  argument has a comma. In Git Bash, also set `MSYS_NO_PATHCONV=1`.
- The results go to the run's bucket (gcloud prints it), under
  `<device>/artifacts/sdcard/Android/data/com.derekzhou.lab/files/`: `chrome.txt` or `webview.txt`, and the
  screenshots. Test Lab's video is `<device>/video.mp4`, and logcat is `<device>/logcat`.

Devices chosen (`gcloud firebase test android models list`):

| model id | phone | GPU |
|---|---|---|
| `a15` | Galaxy A15 (MediaTek Helio G99) | Mali-G57 MC2 |
| `OP5958L1` | OnePlus Nord CE 3 Lite 5G (Snapdragon 695) | Adreno 619 |
