import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  /// Base URL configurable via environment variable API_URL.
  ///
  /// Usage:
  ///   Chrome/Web:        localhost:3000 works as-is
  ///   Android emulator:  flutter run --dart-define=API_URL=http://10.0.2.2:3000/api/v1
  ///   iOS simulator:     flutter run --dart-define=API_URL=http://127.0.0.1:3000/api/v1
  ///   Real device:       flutter run --dart-define=API_URL=http://<YOUR_MACHINE_IP>:3000/api/v1
  static String get baseUrl {
    const envUrl = String.fromEnvironment('API_URL');
    if (envUrl.isNotEmpty) return envUrl;
    return 'http://localhost:3000/api/v1';
  }

  static final FlutterSecureStorage _storage = const FlutterSecureStorage();

  /// Called when session expires and refresh fails — use to redirect to login
  static VoidCallback? onSessionExpired;

  bool _isRefreshing = false;

  late final Dio dio;

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 && !_isRefreshing) {
          _isRefreshing = true;
          try {
            final refreshed = await _tryRefreshToken();
            if (refreshed) {
              final token = await _storage.read(key: 'access_token');
              error.requestOptions.headers['Authorization'] = 'Bearer $token';
              final response = await dio.fetch(error.requestOptions);
              handler.resolve(response);
              return;
            } else {
              // Refresh failed — clear tokens so app redirects to login
              await clearTokens();
              onSessionExpired?.call();
            }
          } finally {
            _isRefreshing = false;
          }
        }
        handler.next(error);
      },
    ));
  }

  Future<bool> _tryRefreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null) return false;

      // Use a separate Dio instance with no interceptors to avoid loops
      final response = await Dio().post(
        '$baseUrl/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(headers: {'Content-Type': 'application/json'}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        await _storage.write(
          key: 'access_token',
          value: response.data['accessToken'],
        );
        if (response.data['refreshToken'] != null) {
          await _storage.write(
            key: 'refresh_token',
            value: response.data['refreshToken'],
          );
        }
        return true;
      }
    } catch (e) {
      debugPrint('Token refresh failed: $e');
    }
    return false;
  }

  static Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
  }

  static Future<void> saveUserRole(String role) async {
    await _storage.write(key: 'user_role', value: role);
  }

  static Future<String?> getUserRole() async {
    return _storage.read(key: 'user_role');
  }

  static Future<void> clearTokens() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
    await _storage.delete(key: 'user_role');
  }

  static Future<String?> getAccessToken() async {
    return _storage.read(key: 'access_token');
  }
}
