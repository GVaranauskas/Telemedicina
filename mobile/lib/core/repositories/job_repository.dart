import '../network/api_client.dart';
import '../models/job_model.dart';

class JobRepository {
  final ApiClient _api;

  JobRepository(this._api);

  Future<List<JobModel>> searchJobs({
    String? type,
    String? shift,
    String? specialtyId,
    String? city,
    String? state,
    double? minSalary,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _api.dio.get('/jobs/search', queryParameters: {
      if (type != null) 'type': type,
      if (shift != null) 'shift': shift,
      if (specialtyId != null) 'specialtyId': specialtyId,
      if (city != null) 'city': city,
      if (state != null) 'state': state,
      if (minSalary != null) 'minSalary': minSalary,
      'page': page,
      'limit': limit,
    });
    // API returns paginated: {data: [...], meta: {...}}
    final data = response.data;
    final list = (data is Map<String, dynamic> ? data['data'] as List? : data as List?) ?? [];
    return list.map((e) => JobModel.fromJson(e)).toList();
  }

  Future<List<JobModel>> getRecommendedJobs({int limit = 10}) async {
    final response = await _api.dio
        .get('/jobs/recommended', queryParameters: {'limit': limit});
    final list = response.data as List? ?? [];
    return list.map((e) => JobModel.fromJson(e)).toList();
  }

  Future<JobModel> getJobById(String id) async {
    final response = await _api.dio.get('/jobs/$id');
    return JobModel.fromJson(response.data);
  }

  Future<void> applyToJob(String jobId, {String? coverLetter}) async {
    await _api.dio.post('/jobs/$jobId/apply', data: {
      if (coverLetter != null) 'coverLetter': coverLetter,
    });
  }

  Future<List<JobApplicationModel>> getMyApplications() async {
    final response = await _api.dio.get('/jobs/my-applications');
    final list = response.data as List? ?? [];
    return list.map((e) => JobApplicationModel.fromJson(e)).toList();
  }
}
