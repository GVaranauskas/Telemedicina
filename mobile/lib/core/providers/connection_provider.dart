import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/connection_model.dart';
import '../repositories/connection_repository.dart';
import 'api_provider.dart';

// ─── State ────────────────────────────────────────────────────
class ConnectionState {
  final List<ConnectionModel> connections;
  final List<ConnectionRequestModel> pendingRequests;
  final List<ConnectionSuggestion> suggestions;
  final bool isLoading;
  final String? error;

  const ConnectionState({
    this.connections = const [],
    this.pendingRequests = const [],
    this.suggestions = const [],
    this.isLoading = false,
    this.error,
  });

  ConnectionState copyWith({
    List<ConnectionModel>? connections,
    List<ConnectionRequestModel>? pendingRequests,
    List<ConnectionSuggestion>? suggestions,
    bool? isLoading,
    String? error,
  }) {
    return ConnectionState(
      connections: connections ?? this.connections,
      pendingRequests: pendingRequests ?? this.pendingRequests,
      suggestions: suggestions ?? this.suggestions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────
class ConnectionNotifier extends StateNotifier<ConnectionState> {
  final ConnectionRepository _repo;

  ConnectionNotifier(this._repo) : super(const ConnectionState());

  Future<void> loadAll() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        _repo.getMyConnections(),
        _repo.getPendingRequests(),
        _repo.getSuggestions(),
      ]);
      state = state.copyWith(
        connections: results[0] as List<ConnectionModel>,
        pendingRequests: results[1] as List<ConnectionRequestModel>,
        suggestions: results[2] as List<ConnectionSuggestion>,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
          isLoading: false, error: 'Erro ao carregar conexões');
    }
  }

  Future<void> sendRequest(String receiverId) async {
    try {
      await _repo.sendRequest(receiverId);
      // Remove from suggestions
      final updated =
          state.suggestions.where((s) => s.doctorId != receiverId).toList();
      state = state.copyWith(suggestions: updated);
    } catch (_) {}
  }

  Future<void> acceptRequest(String requestId) async {
    try {
      await _repo.acceptRequest(requestId);
      await loadAll();
    } catch (_) {}
  }

  Future<void> rejectRequest(String requestId) async {
    try {
      await _repo.rejectRequest(requestId);
      final updated =
          state.pendingRequests.where((r) => r.id != requestId).toList();
      state = state.copyWith(pendingRequests: updated);
    } catch (_) {}
  }

  Future<void> removeConnection(String doctorId) async {
    try {
      await _repo.removeConnection(doctorId);
      final updated =
          state.connections.where((c) => c.id != doctorId).toList();
      state = state.copyWith(connections: updated);
    } catch (_) {}
  }

  Future<void> follow(String targetId) async {
    try {
      await _repo.follow(targetId);
    } catch (_) {}
  }

  Future<void> unfollow(String targetId) async {
    try {
      await _repo.unfollow(targetId);
    } catch (_) {}
  }
}

// ─── Provider ─────────────────────────────────────────────────
final connectionProvider =
    StateNotifierProvider<ConnectionNotifier, ConnectionState>((ref) {
  return ConnectionNotifier(ref.watch(connectionRepositoryProvider));
});
