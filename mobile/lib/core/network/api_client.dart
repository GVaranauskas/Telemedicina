import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  /// Base URL configurable via environment.
  /// For web (Chrome), localhost works. For real devices, use the machine IP.
  static String get baseUrl {
    const envUrl = String.fromEnvironment('API_URL');
    if (envUrl.isNotEmpty) return envUrl;
    // Default: localhost for web/emulator
    return 'http://localhost:3000/api/v1';
  }

  static final FlutterSecureStorage _storage = const FlutterSecureStorage();

  /// Prevent infinite refresh loops
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
          // Try to refresh token (prevent re-entrant calls)
          _isRefreshing = true;
          try {
            final refreshed = await _tryRefreshToken();
            if (refreshed) {
              // Retry original request with new token
              final token = await _storage.read(key: 'access_token');
              error.requestOptions.headers['Authorization'] = 'Bearer $token';
              final response = await dio.fetch(error.requestOptions);
              handler.resolve(response);
              return;
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

  static Future<void> clearTokens() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }

  static Future<String?> getAccessToken() async {
    return _storage.read(key: 'access_token');
  }
}
