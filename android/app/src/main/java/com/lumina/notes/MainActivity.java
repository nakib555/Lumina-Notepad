package com.lumina.notes;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FileSaverPlugin.class);
        super.onCreate(savedInstanceState);
        
        try {
            // Low-End Device Optimizations for Android WebView
            if (bridge != null && bridge.getWebView() != null) {
                android.webkit.WebView webView = bridge.getWebView();
                android.webkit.WebSettings settings = webView.getSettings();
                
                // Force hardware acceleration for the webview layer to offload CPU
                webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
                
                // Disable background pre-rasterization to save massive amounts of RAM and CPU on low-end devices
                settings.setOffscreenPreRaster(false);
                
                // Heavily cache content to reduce networking overhead on CPU/Radio
                settings.setCacheMode(android.webkit.WebSettings.LOAD_CACHE_ELSE_NETWORK);
            }
        } catch (Throwable e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        
        String action = intent.getAction();
        if ((Intent.ACTION_VIEW.equals(action) || Intent.ACTION_EDIT.equals(action)) && intent.getData() != null) {
            final Uri uri = intent.getData();
            
            // Clear the intent immediately so that if the app is minimized and resumed,
            // it doesn't trigger the same file import again.
            intent.setAction(Intent.ACTION_MAIN);
            intent.setData(null);
            setIntent(intent);

            // Run file processing in a background thread to prevent ANR (Application Not Responding)
            // crashes when opening large ZIP files on low-RAM devices.
            new Thread(() -> {
                try {
                    InputStream inputStream = getContentResolver().openInputStream(uri);
                    if (inputStream != null) {
                        java.io.ByteArrayOutputStream byteBuffer = new java.io.ByteArrayOutputStream();
                        int bufferSize = 1024 * 8; // 8KB buffer for faster reading
                        byte[] buffer = new byte[bufferSize];
                        int len;
                        while ((len = inputStream.read(buffer)) != -1) {
                            byteBuffer.write(buffer, 0, len);
                        }
                        inputStream.close();
                        
                        byte[] fileBytes = byteBuffer.toByteArray();
                        
                        String fileName = "Shared Document";
                        Cursor cursor = getContentResolver().query(uri, null, null, null, null);
                        if (cursor != null && cursor.moveToFirst()) {
                            int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                            if (nameIndex != -1) {
                                fileName = cursor.getString(nameIndex);
                            }
                            cursor.close();
                        }
                        
                        String base64Content = Base64.encodeToString(fileBytes, Base64.NO_WRAP);
                        String base64Name = Base64.encodeToString(fileName.getBytes("UTF-8"), Base64.NO_WRAP);
                        
                        String js = "window.luminaInitialFile = { base64Name: '" + base64Name + "', base64Content: '" + base64Content + "' }; window.dispatchEvent(new CustomEvent('lumina-open-file', { detail: window.luminaInitialFile }));";
                        
                        runOnUiThread(() -> {
                            new android.os.Handler().postDelayed(() -> {
                                if (bridge != null && bridge.getWebView() != null) {
                                    bridge.getWebView().evaluateJavascript(js, null);
                                }
                            }, 1500);
                            
                            // Fallback injection for very slow devices initializing Capacitor
                            new android.os.Handler().postDelayed(() -> {
                                if (bridge != null && bridge.getWebView() != null) {
                                    bridge.getWebView().evaluateJavascript(js, null);
                                }
                            }, 4000);
                        });
                    }
                } catch (Throwable e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }
}
