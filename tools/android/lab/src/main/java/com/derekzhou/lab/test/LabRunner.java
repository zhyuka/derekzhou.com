package com.derekzhou.lab.test;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.os.Process;
import android.os.SystemClock;
import android.util.Log;
import android.view.accessibility.AccessibilityNodeInfo;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * The lab's runner: an Instrumentation with no test libraries, speaking am instrument's status protocol so Firebase
 * Test Lab reads it as two tests, Arms#chrome and Arms#webview. Each arm makes a cold visit, then a return visit after
 * the browser's process ended (its disk caches kept).
 *
 * While the page boots the runner uses UiAutomation without accessibility (shell commands and screenshots only), so
 * Chrome does not build its accessibility tree during the boot. At 20 s, 60 s and the end it turns accessibility on
 * for a moment to read the probe's on-screen readout, then off again. The WebView arm reads the readout by
 * evaluateJavascript instead (LabActivity).
 *
 * Arguments (gcloud --environment-variables): url, cold (seconds, default 75), hold (the return visit's seconds,
 * default 600). Everything lands in /sdcard/Android/data/com.derekzhou.lab/files (pull it with
 * --directories-to-pull) and in logcat under the tag DZLAB.
 */
public class LabRunner extends Instrumentation {
  static final String TAG = "DZLAB", CLS = "com.derekzhou.lab.test.Arms", CHROME = "com.android.chrome",
      APP = "com.derekzhou.lab";
  static final long[] SHOTS = { 500, 1000, 1500, 2000, 3000, 4000, 6000, 8000, 12000, 16000 };
  static final String[] DISMISS = { "Accept & continue", "Use without an account", "No thanks", "No, thanks",
      "Got it", "Not now" };

  Bundle args;
  File dir;
  FileWriter out;
  long t0;
  boolean a11y;

  @Override public void onCreate(Bundle a) {
    super.onCreate(a);
    args = a;
    start();
  }

  @Override public void onStart() {
    String cls = args.getString("class", "");
    boolean list = "true".equals(args.getString("log"));
    List<String> run = new ArrayList<>();
    for (String n : new String[] { "chrome", "webview", "plan" })
      if (cls.isEmpty() || (cls.contains(CLS) && (!cls.contains("#") || cls.contains(CLS + "#" + n)))) run.add(n);
    boolean ok = true;
    for (int i = 0; i < run.size(); i++) {
      String n = run.get(i);
      Bundle b = new Bundle();
      b.putString("id", "AndroidJUnitRunner");
      b.putString("class", CLS);
      b.putString("test", n);
      b.putInt("numtests", run.size());
      b.putInt("current", i + 1);
      b.putString("stream", "");
      sendStatus(1, b);
      Bundle e = new Bundle(b);
      int code = 0;
      if (!list) {
        try {
          if (n.equals("chrome")) chrome(); else if (n.equals("webview")) webview(); else plan();
        } catch (Throwable t) {
          code = -2;
          ok = false;
          e.putString("stack", Log.getStackTraceString(t));
          e.putString("stream", "\nError in " + n + ":\n" + Log.getStackTraceString(t));
          log("FAILED " + t);
        } finally { close(); }
      }
      sendStatus(code, e);
    }
    Bundle r = new Bundle();
    r.putString("stream", ok ? "\nOK (" + run.size() + " tests)\n" : "\nFAILURES!!!\n");
    finish(Activity.RESULT_OK, r);
  }

  // ---- the two arms

  void chrome() throws Exception {
    open("chrome.txt");
    String url = arg("url", "https://claude-wk-probe-new.derekzhou.pages.dev/");
    device();
    log("chrome " + grep(sh("dumpsys package " + CHROME), "versionName"));
    sh("pm clear " + CHROME);
    shIn("tee /data/local/tmp/chrome-command-line", "_ --disable-fre --no-default-browser-check --no-first-run\n");
    sh("am set-debug-app --persistent " + CHROME);
    // a first launch on the new-tab page, to get any first-run screens out of the way before the cold visit
    sh("am start -n " + CHROME + "/com.google.android.apps.chrome.Main");
    for (int i = 0; i < 15; i++) { SystemClock.sleep(1000); dismiss(); }
    sh("am force-stop " + CHROME);
    mode(false);
    SystemClock.sleep(2000);
    for (String tag : new String[] { "cold", "return" }) {
      long secs = tag.equals("cold") ? num("cold", 75) : num("hold", 600);
      visit("chrome-" + tag, secs, () -> sh("am start -a android.intent.action.VIEW -d " + url + " -p " + CHROME),
          this::chromeReadout);
      sh("am force-stop " + CHROME);
      SystemClock.sleep(3000);
    }
    sh("am clear-debug-app");
  }

  void webview() throws Exception {
    open("webview.txt");
    String url = arg("url", "https://claude-wk-probe-new.derekzhou.pages.dev/");
    device();
    mode(false);
    for (String tag : new String[] { "cold", "return" }) {
      long secs = tag.equals("cold") ? num("cold", 75) : num("hold", 600);
      Context c = getTargetContext();
      visit("webview-" + tag, secs, () -> c.startActivity(new Intent().setClassName(APP, APP + ".LabActivity")
          .putExtra("url", url).putExtra("tag", tag).putExtra("secs", secs)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK)), null);
      SystemClock.sleep(2000);
      ActivityManager am = (ActivityManager) c.getSystemService(Context.ACTIVITY_SERVICE);
      for (ActivityManager.RunningAppProcessInfo p : am.getRunningAppProcesses())
        if (p.processName.equals(APP + ":web")) { log("ending the WebView process " + p.pid); Process.killProcess(p.pid); }
      SystemClock.sleep(3000);
      File f = new File(dir, "wv-" + tag + ".txt");
      log("---- " + f.getName() + "\n" + (f.exists() ? read(f) : "(missing)"));
    }
  }

  /**
   * Several visits in one run (Arms#plan). The argument plan is visits split by '|', each
   * BROWSER~URL~KIND~SECS[~FLAGS[~rec=START-SECS[-WxH]]] (FLAGS may be empty; rec: a screen recording, see record()):
   * BROWSER chrome (com.android.chrome) or chromium (org.chromium.chrome, installed with --additional-apks); KIND
   * cold (the browser's data cleared, first-run screens passed, then the visit) or return (the browser's process
   * ended, its disk caches kept); FLAGS extra browser command-line switches, '+' between them (for example
   * --force-device-scale-factor=1). Screenshots every 250 ms for the first 20 s (the live site has no readout: its
   * first paint and world show are read from them), then at 30, 45, 60 s and the end; the readout, where the page
   * has one, at 20 s and the end.
   */
  void plan() throws Exception {
    open("plan.txt");
    device();
    String[] visits = arg("plan", "").split("\\|");
    int i = 0;
    for (String v : visits) {
      String[] f = v.split("~");
      if (f.length < 4) { log("bad visit '" + v + "'"); continue; }
      String pkg = f[0].equals("chromium") ? "org.chromium.chrome" : CHROME, url = f[1], kind = f[2];
      long secs = Long.parseLong(f[3]);
      String flags = f.length > 4 ? f[4].replace('+', ' ') : "";
      String tag = String.format("v%d-%s-%s-%s", ++i, f[0], kind, android.net.Uri.parse(url).getHost().split("\\.")[0]);
      log("==== " + tag + ": " + url + (flags.isEmpty() ? "" : " flags " + flags));
      log(f[0] + " " + grep(sh("dumpsys package " + pkg), "versionName"));
      mode(false);
      if (kind.equals("cold")) {
        sh("pm clear " + pkg);
        cmdline(pkg, flags);
        sh("am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -p " + pkg);
        for (int k = 0; k < 15; k++) { SystemClock.sleep(1000); dismiss(); }
        mode(false);
      } else cmdline(pkg, flags);
      sh("am force-stop " + pkg);
      SystemClock.sleep(2000);
      resolve(url);
      long s = SystemClock.uptimeMillis();
      String[] am = new String[1];
      Thread t = new Thread(() -> am[0] = sh("am start -W -a android.intent.action.VIEW -d " + url + " -p " + pkg));
      t.start();
      Thread rec = f.length > 5 && f[5].startsWith("rec=") ? record(tag, s, f[5].substring(4)) : null;
      // (named by the time the screenshot was taken, from just before am start)
      for (long at = 0; at <= 20000; at += 250) {
        until(s + at);
        shot(tag + "-" + String.format("%05d", SystemClock.uptimeMillis() - s));
      }
      t.join(30000);
      if (rec != null) rec.join(60000);
      log(tag + " am start: " + grep(am[0] == null ? "" : am[0], "Time"));
      readout(tag);
      for (long at : new long[] { 30, 45, 60, 120, 300 }) {
        if (at >= secs) break;
        until(s + at * 1000);
        shot(tag + "-" + at + "s");
      }
      until(s + secs * 1000);
      shot(tag + "-end");
      readout(tag);
      sh("am force-stop " + pkg);
    }
    sh("am clear-debug-app");
  }

  void cmdline(String pkg, String flags) throws IOException {
    shIn("tee /data/local/tmp/chrome-command-line",
        "_ --disable-fre --no-default-browser-check --no-first-run " + flags + "\n");
    sh("am set-debug-app --persistent " + pkg);
  }

  /** The probe's readout from the screen (accessibility on for a moment); the page's text where it has none. */
  void readout(String tag) {
    mode(true);
    String text = "";
    for (int i = 0; i < 10; i++) {
      AccessibilityNodeInfo r = ua().getRootInActiveWindow();
      StringBuilder b = new StringBuilder();
      if (r != null) texts(r, b, 0);
      text = b.toString();
      if (text.contains("WORLD SHOWN")) break;
      SystemClock.sleep(500);
    }
    int p = text.indexOf("PREVIEW");
    log(tag + " readout\n" + (p >= 0 ? text.substring(p) : "(no probe readout; page text)\n" + text));
    mode(false);
  }

  interface Step { void run() throws Exception; }

  /** One visit: launch, screenshots through the boot, readouts at 20 s, 60 s, 2 min, 5 min and the end. */
  void visit(String tag, long secs, Step launch, Step readout) throws Exception {
    log("==== " + tag + " for " + secs + " s");
    resolve(arg("url", "https://claude-wk-probe-new.derekzhou.pages.dev/"));
    long s = SystemClock.uptimeMillis();
    launch.run();
    log(tag + " launched");
    for (long at : SHOTS) { until(s + at); shot(tag + "-" + at + "ms"); }
    for (long at : new long[] { 20, 60, 120, 300, 600, 1200 }) {
      if (at > secs) break;
      until(s + at * 1000);
      log(tag + " at " + at + " s");
      shot(tag + "-" + at + "s");
      if (readout != null) readout.run();
    }
    until(s + secs * 1000);
    shot(tag + "-end");
    if (readout != null) readout.run();
  }

  /** Reads Chrome's page text through accessibility (on for a moment), then turns it off again. */
  void chromeReadout() {
    mode(true);
    String text = "";
    for (int i = 0; i < 10; i++) {
      AccessibilityNodeInfo r = ua().getRootInActiveWindow();
      StringBuilder b = new StringBuilder();
      if (r != null) texts(r, b, 0);
      text = b.toString();
      if (text.contains("WORLD SHOWN")) break;
      SystemClock.sleep(500);
    }
    log("readout\n" + text);
    mode(false);
  }

  // ---- helpers

  /**
   * Waits (up to 90 s) until the device's DNS resolves the URL's host. On Test Lab's phones a new pages.dev name can
   * fail (NXDOMAIN) for the first seconds, and the browser's error page and reload would count in first paint. A
   * lookup touches no browser cache, so the visit stays cold.
   */
  void resolve(String url) {
    String host = android.net.Uri.parse(url).getHost();
    long s = SystemClock.uptimeMillis();
    for (int i = 0; ; i++) {
      try {
        java.net.InetAddress a = java.net.InetAddress.getByName(host);
        log("dns " + host + " = " + a.getHostAddress() + " after " + (SystemClock.uptimeMillis() - s) + " ms, "
            + i + " failures");
        return;
      } catch (java.net.UnknownHostException e) {
        if (SystemClock.uptimeMillis() - s > 90000) { log("dns " + host + " still failing after 90 s"); return; }
        SystemClock.sleep(1000);
      }
    }
  }

  UiAutomation ua() { return getUiAutomation(a11y ? 0 : UiAutomation.FLAG_DONT_USE_ACCESSIBILITY); }

  void mode(boolean on) { a11y = on; ua(); }

  void device() {
    log("device " + Build.MANUFACTURER + " " + Build.MODEL + " (" + Build.DEVICE + "), SoC " + Build.SOC_MANUFACTURER
        + " " + Build.SOC_MODEL + ", Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")");
    log("gpu " + grep(sh("dumpsys SurfaceFlinger"), "GLES"));
    log("cpus " + Runtime.getRuntime().availableProcessors() + ", "
        + grep(sh("cat /proc/meminfo"), "MemTotal"));
    // Test Lab turns the animation scales off, which the browser reports as prefers-reduced-motion (the site's still
    // frame); a visitor's phone has them on.
    for (String k : new String[] { "animator_duration_scale", "transition_animation_scale", "window_animation_scale" }) {
      String was = sh("settings get global " + k).trim();
      sh("settings put global " + k + " 1");
      log(k + " was " + was + ", now " + sh("settings get global " + k).trim());
    }
  }

  void dismiss() {
    mode(true);
    AccessibilityNodeInfo r = ua().getRootInActiveWindow();
    if (r != null) for (String l : DISMISS) for (AccessibilityNodeInfo n : r.findAccessibilityNodeInfosByText(l)) {
      AccessibilityNodeInfo c = n;
      while (c != null && !c.isClickable()) c = c.getParent();
      if (c != null && c.performAction(AccessibilityNodeInfo.ACTION_CLICK)) log("first-run screen: tapped '" + l + "'");
    }
  }

  void texts(AccessibilityNodeInfo n, StringBuilder b, int depth) {
    if (depth > 40) return;
    CharSequence t = n.getText();
    if (t != null && t.length() > 0) b.append(t).append('\n');
    for (int i = 0; i < n.getChildCount(); i++) {
      AccessibilityNodeInfo c = n.getChild(i);
      if (c != null) texts(c, b, depth + 1);
    }
  }

  /**
   * A screen recording beside the screenshots: spec START-SECS[-WxH] (seconds after am start, seconds long, START may
   * be fractional; WxH a smaller recording size). screenrecord runs as the shell into /data/local/tmp, and the file is
   * then copied into the results folder as TAG-rec.mp4. The log gives when it started, from am start, to line its
   * frames up with the screenshots. screenrecord writes a frame only when the screen changes, so a still page gives few
   * frames and each frame is a real change.
   */
  Thread record(String tag, long s, String spec) {
    String[] p = spec.split("-");
    long at = Math.round(Double.parseDouble(p[0]) * 1000);
    int len = Integer.parseInt(p[1]);
    Thread r = new Thread(() -> {
      until(s + at);
      log(tag + " screenrecord from " + (SystemClock.uptimeMillis() - s) + " ms, " + len + " s");
      // (an optional third part, WxH, records at that size: some encoders write nothing at the panel's full size,
      // as the Nord CE 3 Lite did at 1080x2400)
      String size = p.length > 2 ? " --size " + p[2] + " --bit-rate 8000000" : " --bit-rate 12000000";
      sh("screenrecord --time-limit " + len + size + " /data/local/tmp/rec.mp4");
      try (InputStream in = new ParcelFileDescriptor.AutoCloseInputStream(ua().executeShellCommand("cat /data/local/tmp/rec.mp4"));
           OutputStream o = new FileOutputStream(new File(dir, tag + "-rec.mp4"))) {
        byte[] b = new byte[65536];
        for (int n; (n = in.read(b)) > 0; ) o.write(b, 0, n);
      } catch (IOException e) { log(tag + " screenrecord copy failed " + e); }
      sh("rm /data/local/tmp/rec.mp4");
    });
    r.start();
    return r;
  }

  void shot(String name) {
    try {
      Bitmap b = ua().takeScreenshot();
      if (b == null) { log("no screenshot " + name); return; }
      try (OutputStream o = new FileOutputStream(new File(dir, name + ".jpg"))) {
        b.compress(Bitmap.CompressFormat.JPEG, 70, o);
      }
      b.recycle();
    } catch (IOException e) { log("screenshot failed " + e); }
  }

  String sh(String cmd) {
    ParcelFileDescriptor p = ua().executeShellCommand(cmd);
    try (InputStream in = new ParcelFileDescriptor.AutoCloseInputStream(p)) { return slurp(in); }
    catch (IOException e) { return "error " + e; }
  }

  void shIn(String cmd, String stdin) throws IOException {
    ParcelFileDescriptor[] p = ua().executeShellCommandRwe(cmd);
    try (OutputStream o = new ParcelFileDescriptor.AutoCloseOutputStream(p[1])) {
      o.write(stdin.getBytes(StandardCharsets.UTF_8));
    }
    try (InputStream in = new ParcelFileDescriptor.AutoCloseInputStream(p[0])) { slurp(in); }
    p[2].close();
  }

  static String slurp(InputStream in) throws IOException {
    StringBuilder b = new StringBuilder();
    BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
    for (String l; (l = r.readLine()) != null; ) b.append(l).append('\n');
    return b.toString();
  }

  static String read(File f) throws IOException { try (InputStream in = new FileInputStream(f)) { return slurp(in); } }

  static String grep(String text, String key) {
    StringBuilder b = new StringBuilder();
    for (String l : text.split("\n")) if (l.contains(key)) b.append(l.trim()).append("; ");
    return b.toString();
  }

  String arg(String k, String d) { String v = args.getString(k); return v == null || v.isEmpty() ? d : v; }

  long num(String k, long d) { try { return Long.parseLong(arg(k, "" + d)); } catch (NumberFormatException e) { return d; } }

  static void until(long t) { long w = t - SystemClock.uptimeMillis(); if (w > 0) SystemClock.sleep(w); }

  void open(String name) throws IOException {
    dir = getTargetContext().getExternalFilesDir(null);
    out = new FileWriter(new File(dir, name), true);
    t0 = SystemClock.uptimeMillis();
  }

  void close() { try { if (out != null) out.close(); } catch (IOException e) { /* closing */ } out = null; }

  void log(String s) {
    String line = (SystemClock.uptimeMillis() - t0) + " ms  " + s;
    Log.i(TAG, line);
    try { if (out != null) { out.write(line + "\n"); out.flush(); } } catch (IOException e) { /* logcat has it */ }
  }
}
