import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/job_model.dart';
import '../repositories/job_repository.dart';
import 'api_provider.dart';

// ─── State ────────────────────────────────────────────────────
class JobState {
  final List<JobModel> jobs;
  final List<JobModel> recommended;
  final bool isLoading;
  final String? error;
  // Filters
  final String? typeFilter;
  final String? shiftFilter;

  const JobState({
    this.jobs = const [],
    this.recommended = const [],
    this.isLoading = false,
    this.error,
    this.typeFilter,
    this.shiftFilter,
  });

  JobState copyWith({
    List<JobModel>? jobs,
    List<JobModel>? recommended,
    bool? isLoading,
    String? error,
    String? typeFilter,
    String? shiftFilter,
  }) {
    return JobState(
      jobs: jobs ?? this.jobs,
      recommended: recommended ?? this.recommended,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      typeFilter: typeFilter ?? this.typeFilter,
      shiftFilter: shiftFilter ?? this.shiftFilter,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────
class JobNotifier extends StateNotifier<JobState> {
  final JobRepository _repo;

  JobNotifier(this._repo) : super(const JobState());

  Future<void> loadJobs() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        _repo.searchJobs(
          type: state.typeFilter,
          shift: state.shiftFilter,
        ),
        _repo.getRecommendedJobs(),
      ]);
      state = state.copyWith(
        jobs: results[0] as List<JobModel>,
        recommended: results[1] as List<JobModel>,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Erro ao carregar vagas');
    }
  }

  void setFilters({String? type, String? shift}) {
    state = state.copyWith(typeFilter: type, shiftFilter: shift);
    loadJobs();
  }

  Future<bool> applyToJob(String jobId, {String? coverLetter}) async {
    try {
      await _repo.applyToJob(jobId, coverLetter: coverLetter);
      return true;
    } catch (_) {
      return false;
    }
  }
}

// ─── Provider ─────────────────────────────────────────────────
final jobProvider = StateNotifierProvider<JobNotifier, JobState>((ref) {
  return JobNotifier(ref.watch(jobRepositoryProvider));
});
