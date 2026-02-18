import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/search_model.dart';
import '../repositories/search_repository.dart';
import 'api_provider.dart';

// ─── State ────────────────────────────────────────────────────
class SearchState {
  final SearchResult? result;
  final bool isSearching;
  final String? error;

  const SearchState({this.result, this.isSearching = false, this.error});

  SearchState copyWith({
    SearchResult? result,
    bool? isSearching,
    String? error,
  }) {
    return SearchState(
      result: result ?? this.result,
      isSearching: isSearching ?? this.isSearching,
      error: error,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────
class SearchNotifier extends StateNotifier<SearchState> {
  final SearchRepository _repo;

  SearchNotifier(this._repo) : super(const SearchState());

  Future<void> search(String query) async {
    state = SearchState(isSearching: true);
    try {
      final result = await _repo.query(query);
      state = SearchState(result: result, isSearching: false);
    } catch (e) {
      state = SearchState(
        isSearching: false,
        error: 'Erro na busca. Tente novamente.',
      );
    }
  }

  void clear() {
    state = const SearchState();
  }
}

// ─── Provider ─────────────────────────────────────────────────
final searchProvider =
    StateNotifierProvider<SearchNotifier, SearchState>((ref) {
  return SearchNotifier(ref.watch(searchRepositoryProvider));
});
