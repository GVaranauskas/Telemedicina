import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_model.dart';
import '../network/api_client.dart';
import '../repositories/auth_repository.dart';
import '../repositories/doctor_repository.dart';
import 'api_provider.dart';

// ─── Auth State ───────────────────────────────────────────────
enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? error;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.error,
  });

  AuthState copyWith({AuthStatus? status, UserModel? user, String? error}) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error,
    );
  }

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
}

// ─── Auth Notifier ────────────────────────────────────────────
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;

  AuthNotifier(this._repo) : super(const AuthState());

  Future<void> checkAuthStatus() async {
    final token = await ApiClient.getAccessToken();
    if (token != null) {
      state = state.copyWith(status: AuthStatus.authenticated);
    } else {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      final response = await _repo.login(email: email, password: password);
      await ApiClient.saveTokens(response.accessToken, response.refreshToken);
      
      // Fetch doctor profile to get fullName
      UserModel userWithFullName = response.user;
      if (response.user.doctorId != null) {
        try {
          final doctorRepo = DoctorRepository(ApiClient());
          final doctor = await doctorRepo.getMyProfile();
          userWithFullName = UserModel(
            id: response.user.id,
            email: response.user.email,
            role: response.user.role,
            doctorId: response.user.doctorId,
            fullName: doctor.fullName,
          );
        } catch (_) {
          // If doctor fetch fails, continue with user without fullName
        }
      }
      
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: userWithFullName,
      );
      return true;
    } on DioException catch (e) {
      final msg = AuthRepository.extractError(e);
      state = state.copyWith(status: AuthStatus.error, error: msg);
      return false;
    } catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, error: 'Erro inesperado: $e');
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String fullName,
    required String crm,
    required String crmState,
    String? phone,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      final response = await _repo.register(
        email: email,
        password: password,
        fullName: fullName,
        crm: crm,
        crmState: crmState,
        phone: phone,
      );
      await ApiClient.saveTokens(response.accessToken, response.refreshToken);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: response.user,
      );
      return true;
    } on DioException catch (e) {
      final msg = AuthRepository.extractError(e);
      state = state.copyWith(status: AuthStatus.error, error: msg);
      return false;
    } catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, error: 'Erro inesperado: $e');
      return false;
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    await ApiClient.clearTokens();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

// ─── Provider ─────────────────────────────────────────────────
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});
