import '../network/api_client.dart';
import '../models/doctor_model.dart';

class DoctorRepository {
  final ApiClient _api;

  DoctorRepository(this._api);

  Future<DoctorModel> getMyProfile() async {
    final response = await _api.dio.get('/doctors/me');
    return DoctorModel.fromJson(response.data);
  }

  Future<DoctorModel> getProfile(String doctorId) async {
    final response = await _api.dio.get('/doctors/$doctorId');
    return DoctorModel.fromJson(response.data);
  }

  Future<DoctorModel> updateProfile(Map<String, dynamic> data) async {
    final response = await _api.dio.put('/doctors/me', data: data);
    return DoctorModel.fromJson(response.data);
  }

  Future<void> addSpecialty(String specialtyId,
      {bool isPrimary = false, String? rqeNumber}) async {
    await _api.dio.post('/doctors/me/specialties', data: {
      'specialtyId': specialtyId,
      'isPrimary': isPrimary,
      if (rqeNumber != null) 'rqeNumber': rqeNumber,
    });
  }

  Future<void> removeSpecialty(String specialtyId) async {
    await _api.dio.delete('/doctors/me/specialties/$specialtyId');
  }

  Future<void> addSkill(String skillId) async {
    await _api.dio.post('/doctors/me/skills', data: {'skillId': skillId});
  }

  Future<void> removeSkill(String skillId) async {
    await _api.dio.delete('/doctors/me/skills/$skillId');
  }

  Future<void> addExperience(Map<String, dynamic> data) async {
    await _api.dio.post('/doctors/me/experiences', data: data);
  }

  Future<void> removeExperience(String experienceId) async {
    await _api.dio.delete('/doctors/me/experiences/$experienceId');
  }

  Future<List<DoctorModel>> searchDoctors({
    String? name,
    String? specialtyId,
    String? city,
    String? state,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _api.dio.get('/doctors', queryParameters: {
      if (name != null) 'name': name,
      if (specialtyId != null) 'specialtyId': specialtyId,
      if (city != null) 'city': city,
      if (state != null) 'state': state,
      'page': page,
      'limit': limit,
    });
    final list = response.data as List? ?? [];
    return list.map((e) => DoctorModel.fromJson(e)).toList();
  }

  Future<List<Specialty>> getAllSpecialties() async {
    final response = await _api.dio.get('/doctors/ref/specialties');
    final list = response.data as List? ?? [];
    return list.map((e) => Specialty.fromJson(e)).toList();
  }

  Future<List<Skill>> getAllSkills() async {
    final response = await _api.dio.get('/doctors/ref/skills');
    final list = response.data as List? ?? [];
    return list.map((e) => Skill.fromJson(e)).toList();
  }
}
