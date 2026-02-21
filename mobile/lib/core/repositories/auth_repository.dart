import 'package:dio/dio.dart';
import '../network/api_client.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient _api;

  AuthRepository(this._api);

  Future<AuthResponse> register({
    required String email,
    required String password,
    required String fullName,
    required String crm,
    required String crmState,
    String? phone,
  }) async {
    final response = await _api.dio.post('/auth/register', data: {
      'email': email,
      'password': password,
      'fullName': fullName,
      'crm': crm,
      'crmState': crmState,
      if (phone != null) 'phone': phone,
    });
    return AuthResponse.fromJson(response.data);
  }

  Future<AuthResponse> registerPatient({
    required String email,
    required String password,
    required String fullName,
    String? cpf,
    String? phone,
    String? state,
    String? city,
  }) async {
    final response = await _api.dio.post('/auth/register-patient', data: {
      'email': email,
      'password': password,
      'fullName': fullName,
      if (cpf != null) 'cpf': cpf,
      if (phone != null) 'phone': phone,
      if (state != null) 'state': state,
      if (city != null) 'city': city,
    });
    return AuthResponse.fromJson(response.data);
  }

  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    final response = await _api.dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return AuthResponse.fromJson(response.data);
  }

  Future<void> logout() async {
    try {
      await _api.dio.post('/auth/logout');
    } catch (_) {
      // Ignore errors on logout - we'll clear tokens locally anyway
    }
  }

  /// Extracts a user-friendly error message from a DioException
  static String extractError(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      return data['message'] ?? 'Erro desconhecido';
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Servidor não respondeu. Verifique sua conexão.';
    }
    if (e.type == DioExceptionType.connectionError) {
      return 'Não foi possível conectar ao servidor.';
    }
    return 'Erro de conexão';
  }
}
