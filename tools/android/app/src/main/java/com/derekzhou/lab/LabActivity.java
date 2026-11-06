package com.derekzhou.lab;

import android.app.Activity;
import android.content.pm.PackageInfo;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;

/**
 * A bare WebView, standing in for an app's in-app browser. It loads the URL it is given and, every second for the
 * first 30 s and every 5 s after, reads the probe's on-screen readout (the last pre in the body) by
 * evaluateJavascript. Each reading goes to logcat (tag DZLAB) and to wv-TAG.txt in the app's external files folder.
 * Extras: url, tag (cold or return), secs (how long to keep reading).
 */
public class LabActivity extends Activity {
  static final String TAG = "DZLAB";
  static final String READ = "(function(){var p=document.querySelectorAll('body>pre');"
      + "return p.length?p[p.length-1].textContent:'(no readout yet)';})()";
  static final String GL = "(function(){try{var g=document.createElement('canvas').getContext('webgl'),"
      + "e=g.getExtension('WEBGL_debug_renderer_info');return g.getParameter(e.UNMASKED_VENDOR_WEBGL)+' | '"
      + "+g.getParameter(e.UNMASKED_RENDERER_WEBGL);}catch(x){return 'no renderer: '+x;}})()";

  final Handler h = new Handler(Looper.getMainLooper());
  WebView w;
  Writer out;
  long t0, secs;
  boolean glDone;

  void log(String s) {
    String line = (SystemClock.uptimeMillis() - t0) + " ms  " + s;
    Log.i(TAG, "webview " + line);
    try { out.write(line + "\n"); out.flush(); } catch (IOException e) { /* logcat has it */ }
  }

  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    t0 = SystemClock.uptimeMillis();
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    String url = getIntent().getStringExtra("url"), tag = getIntent().getStringExtra("tag");
    secs = getIntent().getLongExtra("secs", 75);
    try { out = new FileWriter(new File(getExternalFilesDir(null), "wv-" + tag + ".txt"), true); }
    catch (IOException e) { throw new RuntimeException(e); }
    w = new WebView(this);
    WebSettings s = w.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    w.setWebViewClient(new WebViewClient() {
      @Override public void onPageStarted(WebView v, String u, Bitmap f) { log("page started " + u); }
      @Override public void onPageFinished(WebView v, String u) { log("page finished " + u); }
    });
    setContentView(w);
    PackageInfo p = WebView.getCurrentWebViewPackage();
    log("visit " + tag + ", " + url + ", WebView " + (p == null ? "?" : p.packageName + " " + p.versionName));
    log("ua " + s.getUserAgentString());
    w.loadUrl(url);
    h.postDelayed(this::poll, 1000);
  }

  void poll() {
    long el = SystemClock.uptimeMillis() - t0;
    w.evaluateJavascript(READ, v -> log("probe " + v));
    if (!glDone && el > 20000) { glDone = true; w.evaluateJavascript(GL, v -> log("gl " + v)); }
    if (el < secs * 1000) h.postDelayed(this::poll, el < 30000 ? 1000 : 5000);
    else log("done");
  }

  @Override protected void onDestroy() {
    h.removeCallbacksAndMessages(null);
    try { out.close(); } catch (IOException e) { /* closing */ }
    super.onDestroy();
  }
}
