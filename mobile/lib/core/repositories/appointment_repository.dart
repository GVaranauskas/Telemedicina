import '../network/api_client.dart';
import '../models/appointment_model.dart';

class AppointmentRepository {
  final ApiClient _api;

  AppointmentRepository(this._api);

  Future<List<DoctorMatchResult>> searchDoctorsNearby({
    required double latitude,
    required double longitude,
    double? radiusKm,
    String? specialtyId,
    String? date,
    String? preferredTime,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _api.dio.post('/appointments/search-doctors', data: {
      'latitude': latitude,
      'longitude': longitude,
      if (radiusKm != null) 'radiusKm': radiusKm,
      if (specialtyId != null) 'specialtyId': specialtyId,
      if (date != null) 'date': date,
      if (preferredTime != null) 'preferredTime': preferredTime,
      'page': page,
      'limit': limit,
    });

    final data = response.data['data'] as List;
    return data.map((e) => DoctorMatchResult.fromJson(e)).toList();
  }

  Future<AppointmentModel> createAppointment({
    required String doctorId,
    required String workplaceId,
    required String scheduledAt,
    String? type,
    String? reason,
  }) async {
    final response = await _api.dio.post('/appointments', data: {
      'doctorId': doctorId,
      'workplaceId': workplaceId,
      'scheduledAt': scheduledAt,
      if (type != null) 'type': type,
      if (reason != null) 'reason': reason,
    });

    return AppointmentModel.fromJson(response.data);
  }

  Future<void> cancelAppointment(String appointmentId, {String? reason}) async {
    await _api.dio.patch('/appointments/$appointmentId/cancel', data: {
      if (reason != null) 'reason': reason,
    });
  }

  Future<void> confirmAppointment(String appointmentId) async {
    await _api.dio.patch('/appointments/$appointmentId/confirm');
  }
}
