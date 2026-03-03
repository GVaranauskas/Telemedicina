import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/study_group_model.dart';
import '../repositories/study_groups_repository.dart';
import 'api_provider.dart';

// ─── State ────────────────────────────────────────────────────
class StudyGroupsState {
  final List<StudyGroupModel> groups;
  final bool isLoading;
  final String? error;
  final String? specialtyFilter;
  final String? searchQuery;

  const StudyGroupsState({
    this.groups = const [],
    this.isLoading = false,
    this.error,
    this.specialtyFilter,
    this.searchQuery,
  });

  StudyGroupsState copyWith({
    List<StudyGroupModel>? groups,
    bool? isLoading,
    String? error,
    String? specialtyFilter,
    String? searchQuery,
  }) {
    return StudyGroupsState(
      groups: groups ?? this.groups,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      specialtyFilter: specialtyFilter ?? this.specialtyFilter,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────
class StudyGroupsNotifier extends StateNotifier<StudyGroupsState> {
  final StudyGroupsRepository _repo;

  StudyGroupsNotifier(this._repo) : super(const StudyGroupsState());

  Future<void> loadGroups() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final groups = await _repo.getGroups(
        specialty: state.specialtyFilter,
        search: state.searchQuery,
      );
      state = state.copyWith(groups: groups, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Erro ao carregar grupos');
    }
  }

  void search(String query) {
    state = state.copyWith(searchQuery: query.isEmpty ? null : query);
    loadGroups();
  }

  Future<bool> joinGroup(String groupId) async {
    try {
      await _repo.joinGroup(groupId);
      state = state.copyWith(
        groups: state.groups.map((g) {
          if (g.id == groupId) {
            return StudyGroupModel(
              id: g.id,
              name: g.name,
              description: g.description,
              specialtyId: g.specialtyId,
              specialtyName: g.specialtyName,
              isPublic: g.isPublic,
              maxMembers: g.maxMembers,
              memberCount: g.memberCount + 1,
              isMember: true,
            );
          }
          return g;
        }).toList(),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> leaveGroup(String groupId) async {
    try {
      await _repo.leaveGroup(groupId);
      state = state.copyWith(
        groups: state.groups.map((g) {
          if (g.id == groupId) {
            return StudyGroupModel(
              id: g.id,
              name: g.name,
              description: g.description,
              specialtyId: g.specialtyId,
              specialtyName: g.specialtyName,
              isPublic: g.isPublic,
              maxMembers: g.maxMembers,
              memberCount: g.memberCount > 0 ? g.memberCount - 1 : 0,
              isMember: false,
            );
          }
          return g;
        }).toList(),
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}

// ─── Provider ─────────────────────────────────────────────────
final studyGroupsRepositoryProvider = Provider<StudyGroupsRepository>(
  (ref) => StudyGroupsRepository(ref.watch(apiClientProvider)),
);

final studyGroupsProvider =
    StateNotifierProvider<StudyGroupsNotifier, StudyGroupsState>((ref) {
  return StudyGroupsNotifier(ref.watch(studyGroupsRepositoryProvider));
});
