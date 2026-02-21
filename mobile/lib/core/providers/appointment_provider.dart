import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/appointment_model.dart';
import '../repositories/appointment_repository.dart';
import 'api_provider.dart';

// ─── Search State ────────────────────────────────────────────

class DoctorSearchState {
  final bool isLoading;
  final List<DoctorMatchResult> results;
  final String? error;

  const DoctorSearchState({
    this.isLoading = false,
    this.results = const [],
    this.error,
  });

  DoctorSearchState copyWith({
    bool? isLoading,
    List<DoctorMatchResult>? results,
    String? error,
  }) {
    return DoctorSearchState(
      isLoading: isLoading ?? this.isLoading,
      results: results ?? this.results,
      error: error,
    );
  }
}

class DoctorSearchNotifier extends StateNotifier<DoctorSearchState> {
  final AppointmentRepository _repo;

  DoctorSearchNotifier(this._repo) : super(const DoctorSearchState());

  Future<void> searchNearby({
    required double latitude,
    required double longitude,
    double? radiusKm,
    String? specialtyId,
    String? date,
    String? preferredTime,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await _repo.searchDoctorsNearby(
        latitude: latitude,
        longitude: longitude,
        radiusKm: radiusKm,
        specialtyId: specialtyId,
        date: date,
        preferredTime: preferredTime,
      );
      state = state.copyWith(isLoading: false, results: results);
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.response?.data?['message'] ?? 'Erro ao buscar medicos',
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Erro inesperado: $e');
    }
  }

  void clearResults() {
    state = const DoctorSearchState();
  }
}

// ─── Appointment State ───────────────────────────────────────

class AppointmentState {
  final bool isLoading;
  final List<AppointmentModel> appointments;
  final String? error;

  const AppointmentState({
    this.isLoading = false,
    this.appointments = const [],
    this.error,
  });

  AppointmentState copyWith({
    bool? isLoading,
    List<AppointmentModel>? appointments,
    String? error,
  }) {
    return AppointmentState(
      isLoading: isLoading ?? this.isLoading,
      appointments: appointments ?? this.appointments,
      error: error,
    );
  }
}

class AppointmentNotifier extends StateNotifier<AppointmentState> {
  final AppointmentRepository _repo;

  AppointmentNotifier(this._repo) : super(const AppointmentState());

  Future<AppointmentModel?> bookAppointment({
    required String doctorId,
    required String workplaceId,
    required String scheduledAt,
    String? type,
    String? reason,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final appointment = await _repo.createAppointment(
        doctorId: doctorId,
        workplaceId: workplaceId,
        scheduledAt: scheduledAt,
        type: type,
        reason: reason,
      );
      // Add to local state
      state = state.copyWith(
        isLoading: false,
        appointments: [appointment, ...state.appointments],
      );
      return appointment;
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.response?.data?['message'] ?? 'Erro ao agendar consulta',
      );
      return null;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Erro inesperado: $e');
      return null;
    }
  }

  Future<void> cancelAppointment(String appointmentId, {String? reason}) async {
    try {
      await _repo.cancelAppointment(appointmentId, reason: reason);
      state = state.copyWith(
        appointments: state.appointments
            .map((a) => a.id == appointmentId
                ? AppointmentModel(
                    id: a.id,
                    patientId: a.patientId,
                    doctorId: a.doctorId,
                    workplaceId: a.workplaceId,
                    scheduledAt: a.scheduledAt,
                    durationMin: a.durationMin,
                    type: a.type,
                    status: 'CANCELLED_BY_PATIENT',
                    reason: a.reason,
                    notes: a.notes,
                    cancelledAt: DateTime.now(),
                    cancelReason: reason,
                    doctor: a.doctor,
                    workplace: a.workplace,
                  )
                : a)
            .toList(),
      );
    } catch (e) {
      state = state.copyWith(error: 'Erro ao cancelar consulta');
    }
  }
}

// ─── Providers ───────────────────────────────────────────────

final appointmentRepositoryProvider = Provider<AppointmentRepository>(
  (ref) => AppointmentRepository(ref.watch(apiClientProvider)),
);

final doctorSearchProvider =
    StateNotifierProvider<DoctorSearchNotifier, DoctorSearchState>((ref) {
  return DoctorSearchNotifier(ref.watch(appointmentRepositoryProvider));
});

final appointmentProvider =
    StateNotifierProvider<AppointmentNotifier, AppointmentState>((ref) {
  return AppointmentNotifier(ref.watch(appointmentRepositoryProvider));
});
