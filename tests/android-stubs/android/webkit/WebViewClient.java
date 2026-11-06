package android.webkit;
public class WebViewClient {
  public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return null; }
  public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return false; }
  public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) { return false; }
}