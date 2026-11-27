package com.fangxue.studydesk;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public final class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + ASSET_HOST + "/index.html";
    private static final int IMPORT_RECORDS = 101;
    private static final int MAX_IMPORT_SIZE = 12 * 1024 * 1024;
    private static final Map<String, String> ASSETS = new HashMap<>();
    private static final Map<String, String> ASSET_HEADERS = new HashMap<>();
    static {
        ASSETS.put("/index.html", "text/html");
        ASSETS.put("/city-bank.js", "text/javascript");
        ASSETS.put("/account.js", "text/javascript");
        ASSETS.put("/account.css", "text/css");
        ASSETS.put("/android.css", "text/css");
        ASSET_HEADERS.put("Content-Security-Policy", "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
        ASSET_HEADERS.put("X-Content-Type-Options", "nosniff");
    }
    private WebView web;
    private StudyDatabase database;
    private long importAccount = -1;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        try (InputStream bank = getAssets().open("question-bank.json")) {
            database = new StudyDatabase(this, new JSONObject(readText(bank, 2 * 1024 * 1024)));
        } catch (IOException | JSONException error) {
            Toast.makeText(this, "无法加载题库，请重新安装应用。", Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        if (state != null) importAccount = state.getLong("importAccount", -1);
        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(Color.rgb(246, 248, 252));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            layout.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                Insets insets = windowInsets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(insets.left, insets.top, insets.right, insets.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(246, 248, 252));
        layout.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(layout);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.setWebViewClient(new AssetClient());
        web.addJavascriptInterface(new StudyBridge(), "StudyAndroid");
        web.loadUrl(HOME);
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        state.putLong("importAccount", importAccount);
        super.onSaveInstanceState(state);
    }

    @Override public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("typeof window.studyAndroidBack === 'function' && window.studyAndroidBack()", value -> {
            if (!"true".equals(value)) finish();
        });
    }

    @Override protected void onPause() {
        super.onPause();
        if (web != null) {
            web.evaluateJavascript("document.querySelector('audio')?.pause()", null);
            web.onPause();
        }
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("StudyAndroid");
            if (web.getParent() instanceof FrameLayout) ((FrameLayout) web.getParent()).removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    private static boolean local(Uri uri) {
        return "https".equals(uri.getScheme()) && ASSET_HOST.equals(uri.getEncodedAuthority());
    }

    private final class AssetClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String path = uri.getPath();
            if ("GET".equals(request.getMethod()) && local(uri) && ASSETS.containsKey(path)) {
                try {
                    return new WebResourceResponse(ASSETS.get(path), "UTF-8", 200, "OK", ASSET_HEADERS, getAssets().open(path.substring(1)));
                } catch (IOException ignored) { /* Missing assets return 404. */ }
            }
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (local(uri) && "/index.html".equals(uri.getPath())) return false;
            if (request.isForMainFrame() && request.hasGesture() && "https".equals(uri.getScheme())) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
                catch (ActivityNotFoundException error) { Toast.makeText(MainActivity.this, "没有可打开资料链接的浏览器。", Toast.LENGTH_SHORT).show(); }
            }
            return true;
        }
    }

    public final class StudyBridge {
        @JavascriptInterface public String request(String endpoint, String payload) {
            try {
                if (payload == null || payload.length() > 8192) throw new StudyDatabase.Problem(400, "请求内容不正确。");
                return response(200, database.request(endpoint, new JSONObject(payload))).toString();
            } catch (StudyDatabase.Problem error) {
                return failure(error.status, error.getMessage()).toString();
            } catch (Exception error) {
                android.util.Log.e("StudyDesk", "Database request failed", error);
                return failure(500, "暂时无法保存，请重试。").toString();
            }
        }

        @JavascriptInterface public void chooseImport() {
            runOnUiThread(() -> {
                if (importAccount != -1) return;
                importAccount = database.signedInId();
                if (importAccount == -1) { reportImport(failure(401, "请先登录学习账号。")); return; }
                Intent chooser = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                try { startActivityForResult(chooser, IMPORT_RECORDS); }
                catch (ActivityNotFoundException error) {
                    importAccount = -1;
                    reportImport(failure(500, "手机文件选择器无法打开。"));
                }
            });
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != IMPORT_RECORDS) return;
        long destination = importAccount;
        importAccount = -1;
        if (result != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        new Thread(() -> {
            JSONObject output;
            try (InputStream file = getContentResolver().openInputStream(uri)) {
                if (file == null) throw new IOException("Missing file data");
                output = response(200, database.importRecords(destination, new JSONObject(readText(file, MAX_IMPORT_SIZE))));
            } catch (StudyDatabase.Problem error) {
                output = failure(error.status, error.getMessage());
            } catch (IOException | JSONException error) {
                output = failure(400, "无法读取这个文件。请选电脑端下载的 JSON 学习记录，文件大小需在 12 MB 以内。");
            } catch (Exception error) {
                android.util.Log.e("StudyDesk", "Record import failed", error);
                output = failure(500, "导入未完成，请重试。");
            }
            JSONObject message = output;
            runOnUiThread(() -> reportImport(message));
        }, "study-record-import").start();
    }

    private void reportImport(JSONObject output) {
        if (web != null) web.evaluateJavascript("window.studyAccount?.onImport(" + output + ")", null);
    }

    private static JSONObject response(int status, JSONObject data) {
        try { return new JSONObject().put("status", status).put("data", data); }
        catch (JSONException error) { throw new IllegalStateException(error); }
    }

    private static JSONObject failure(int status, String message) {
        try { return response(status, new JSONObject().put("error", message)); }
        catch (JSONException error) { throw new IllegalStateException(error); }
    }

    private static String readText(InputStream input, int maxSize) throws IOException {
        byte[] buffer = new byte[8192];
        ByteArrayOutputStream contents = new ByteArrayOutputStream();
        for (int read; (read = input.read(buffer)) != -1;) {
            if (contents.size() + read > maxSize) throw new IOException("File exceeds the maximum size");
            contents.write(buffer, 0, read);
        }
        return contents.toString("UTF-8");
    }
}
