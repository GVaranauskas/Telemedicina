import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/doctor_model.dart';
import '../repositories/doctor_repository.dart';
import 'api_provider.dart';

// ─── Profile State ────────────────────────────────────────────
class ProfileState {
  final DoctorModel? doctor;
  final bool isLoading;
  final String? error;

  const ProfileState({this.doctor, this.isLoading = false, this.error});

  ProfileState copyWith({DoctorModel? doctor, bool? isLoading, String? error}) {
    return ProfileState(
      doctor: doctor ?? this.doctor,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// ─── Profile Notifier ─────────────────────────────────────────
class ProfileNotifier extends StateNotifier<ProfileState> {
  final DoctorRepository _repo;

  ProfileNotifier(this._repo) : super(const ProfileState());

  Future<void> loadMyProfile() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final doctor = await _repo.getMyProfile();
      state = state.copyWith(doctor: doctor, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Erro ao carregar perfil: $e',
      );
    }
  }

  Future<void> updateProfile(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final doctor = await _repo.updateProfile(data);
      state = state.copyWith(doctor: doctor, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Erro ao atualizar perfil: $e',
      );
    }
  }

  Future<void> addSpecialty(String specialtyId,
      {bool isPrimary = false}) async {
    try {
      await _repo.addSpecialty(specialtyId, isPrimary: isPrimary);
      await loadMyProfile();
    } catch (e) {
      state = state.copyWith(error: 'Erro ao adicionar especialidade');
    }
  }

  Future<void> removeSpecialty(String specialtyId) async {
    try {
      await _repo.removeSpecialty(specialtyId);
      await loadMyProfile();
    } catch (_) {}
  }

  Future<void> addSkill(String skillId) async {
    try {
      await _repo.addSkill(skillId);
      await loadMyProfile();
    } catch (_) {}
  }

  Future<void> removeSkill(String skillId) async {
    try {
      await _repo.removeSkill(skillId);
      await loadMyProfile();
    } catch (_) {}
  }
}

// ─── Providers ────────────────────────────────────────────────
final profileProvider =
    StateNotifierProvider<ProfileNotifier, ProfileState>((ref) {
  return ProfileNotifier(ref.watch(doctorRepositoryProvider));
});

final specialtiesProvider = FutureProvider<List<Specialty>>((ref) {
  return ref.watch(doctorRepositoryProvider).getAllSpecialties();
});

final skillsProvider = FutureProvider<List<Skill>>((ref) {
  return ref.watch(doctorRepositoryProvider).getAllSkills();
});
