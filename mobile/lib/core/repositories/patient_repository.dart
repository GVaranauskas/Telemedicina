import '../network/api_client.dart';
import '../models/patient_model.dart';
import '../models/appointment_model.dart';

class PatientRepository {
  final ApiClient _api;

  PatientRepository(this._api);

  Future<PatientModel> getMyProfile() async {
    final response = await _api.dio.get('/patients/me');
    return PatientModel.fromJson(response.data);
  }

  Future<PatientModel> updateProfile(Map<String, dynamic> data) async {
    final response = await _api.dio.put('/patients/me', data: data);
    return PatientModel.fromJson(response.data);
  }

  Future<List<AppointmentModel>> getMyAppointments({
    String? status,
    bool upcoming = false,
    int page = 1,
    int limit = 20,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (status != null) params['status'] = status;
    if (upcoming) params['upcoming'] = 'true';

    final response = await _api.dio.get(
      '/patients/me/appointments',
      queryParameters: params,
    );

    final data = response.data['data'] as List;
    return data.map((e) => AppointmentModel.fromJson(e)).toList();
  }
}
