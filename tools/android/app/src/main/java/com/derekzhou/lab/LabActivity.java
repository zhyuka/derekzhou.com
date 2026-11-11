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

  /**
   * The lab's own timing, for pages with no readout (the live site), injected when the page starts loading (extra
   * inject). Times are performance.now(), from navigation start, so a late injection still reads right. Earlier
   * long tasks come from the buffered longtask entries; rAF gaps only from the injection on.
   */
  static final String INJECT = "(function(){if(window.__lab)return;var L=window.__lab={shown:-1,max:0,maxAt:-1,"
      + "n100:0,t100:0,lt:[],ring:[],at:performance.now()},last=-1;"
      + "function sky(){if(L.shown<0){var c=document.querySelector('canvas.sky');"
      + "if(c&&c.classList.contains('on'))L.shown=performance.now();}}"
      + "function f(){var n=performance.now();if(last>=0){var g=n-last;L.ring.push(g);if(L.ring.length>120)L.ring.shift();"
      + "if(g>L.max){L.max=g;L.maxAt=last;}if(g>100){L.n100++;L.t100+=g;}}last=n;sky();requestAnimationFrame(f);}"
      + "requestAnimationFrame(f);try{new MutationObserver(sky).observe(document,{subtree:true,attributes:true,"
      + "attributeFilter:['class'],childList:true});}catch(e){}"
      + "try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){L.lt.push([Math.round(e.startTime),"
      + "Math.round(e.duration)]);});}).observe({type:'longtask',buffered:true});}catch(e){}})()";
  static final String READ_LAB = "(function(){var L=window.__lab;if(!L)return 'no lab script';"
      + "var p=performance.getEntriesByName('first-contentful-paint')[0],r=L.ring.slice().sort(function(a,b){return a-b;}),"
      + "md=r.length?r[r.length>>1]:0,lt=L.lt.slice().sort(function(a,b){return b[1]-a[1];});"
      + "return JSON.stringify({now:Math.round(performance.now()),injected:Math.round(L.at),"
      + "fcp:p?Math.round(p.startTime):-1,shown:Math.round(L.shown),maxGap:Math.round(L.max),maxGapAt:Math.round(L.maxAt),"
      + "gaps100:L.n100,gaps100ms:Math.round(L.t100),longtasks:L.lt.length,longest3:lt.slice(0,3),"
      + "fps:md?Math.round(1000/md):0,medianMs:Math.round(md*10)/10});})()";

  final Handler h = new Handler(Looper.getMainLooper());
  boolean inject;
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
    inject = getIntent().getBooleanExtra("inject", false);
    try { out = new FileWriter(new File(getExternalFilesDir(null), "wv-" + tag + ".txt"), true); }
    catch (IOException e) { throw new RuntimeException(e); }
    w = new WebView(this);
    WebSettings s = w.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    w.setWebViewClient(new WebViewClient() {
      @Override public void onPageStarted(WebView v, String u, Bitmap f) {
        log("page started " + u);
        if (inject) v.evaluateJavascript(INJECT, null);
      }
      @Override public void onPageFinished(WebView v, String u) { log("page finished " + u); }
    });
    setContentView(w);
    PackageInfo p = WebView.getCurrentWebViewPackage();
    log("visit " + tag + ", " + url + ", WebView " + (p == null ? "?" : p.packageName + " " + p.versionName));
    log("ua " + s.getUserAgentString());
    if (getIntent().getBooleanExtra("clear", false)) {   // a cold visit: the WebView's HTTP cache and storage emptied
      w.clearCache(true);
      android.webkit.WebStorage.getInstance().deleteAllData();
      android.webkit.CookieManager.getInstance().removeAllCookies(null);
      log("caches cleared");
    }
    w.loadUrl(url);
    h.postDelayed(this::poll, 1000);
  }

  void poll() {
    long el = SystemClock.uptimeMillis() - t0;
    if (inject) {
      w.evaluateJavascript(INJECT, null);   // (again, in case the first ran before the new document)
      w.evaluateJavascript(READ_LAB, v -> log("lab " + v));
    } else w.evaluateJavascript(READ, v -> log("probe " + v));
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
