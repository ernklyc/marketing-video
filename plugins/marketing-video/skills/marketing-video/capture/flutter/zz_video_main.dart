// TEMPORARY (marketing video capture) — copy to lib/, run with -t lib/zz_video_main.dart, DELETE afterwards.
// Routes the app's HTTP calls through the local capture proxy (capture/flutter/proxy.cjs).
// Adapt the import + override hook to the app's HTTP layer (here: FlutterFlow ApiManager.testClientOverride).
import 'package:http/http.dart' as http;

import 'backend/api_requests/api_manager.dart';
import 'main.dart' as app;

class _VideoClient extends http.BaseClient {
  final http.Client _inner = http.Client();

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (request is! http.Request) return _inner.send(request);
    final r = http.Request(request.method, Uri.parse('http://127.0.0.1:8099/p'))
      ..headers.addAll(request.headers)
      ..headers['x-target'] = request.url.toString()
      ..bodyBytes = request.bodyBytes
      ..followRedirects = request.followRedirects;
    return _inner.send(r);
  }
}

void main() {
  // ignore: invalid_use_of_visible_for_testing_member
  ApiManager.testClientOverride = _VideoClient();
  app.main();
}
