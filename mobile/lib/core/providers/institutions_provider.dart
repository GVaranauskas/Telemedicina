import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../repositories/institutions_repository.dart';
import 'api_provider.dart';

// ─── State ────────────────────────────────────────────────────
class InstitutionsState {
  final List<Map<String, dynamic>> institutions;
  final bool isLoading;
  final String? error;
  final String? typeFilter;
  final String? cityFilter;
  final String? searchQuery;

  const InstitutionsState({
    this.institutions = const [],
    this.isLoading = false,
    this.error,
    this.typeFilter,
    this.cityFilter,
    this.searchQuery,
  });

  InstitutionsState copyWith({
    List<Map<String, dynamic>>? institutions,
    bool? isLoading,
    String? error,
    String? typeFilter,
    String? cityFilter,
    String? searchQuery,
  }) {
    return InstitutionsState(
      institutions: institutions ?? this.institutions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      typeFilter: typeFilter ?? this.typeFilter,
      cityFilter: cityFilter ?? this.cityFilter,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────
class InstitutionsNotifier extends StateNotifier<InstitutionsState> {
  final InstitutionsRepository _repo;

  InstitutionsNotifier(this._repo) : super(const InstitutionsState());

  Future<void> loadInstitutions() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final institutions = await _repo.getInstitutions(
        search: state.searchQuery,
        type: state.typeFilter,
        city: state.cityFilter,
      );
      state = state.copyWith(institutions: institutions, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Erro ao carregar instituições');
    }
  }

  void search(String query) {
    state = state.copyWith(searchQuery: query.isEmpty ? null : query);
    loadInstitutions();
  }

  void setFilters({String? type, String? city}) {
    state = state.copyWith(typeFilter: type, cityFilter: city);
    loadInstitutions();
  }

  void clearFilters() {
    state = const InstitutionsState();
    loadInstitutions();
  }
}

// ─── Provider ─────────────────────────────────────────────────
final institutionsRepositoryProvider = Provider<InstitutionsRepository>(
  (ref) => InstitutionsRepository(ref.watch(apiClientProvider)),
);

final institutionsProvider =
    StateNotifierProvider<InstitutionsNotifier, InstitutionsState>((ref) {
  return InstitutionsNotifier(ref.watch(institutionsRepositoryProvider));
});
