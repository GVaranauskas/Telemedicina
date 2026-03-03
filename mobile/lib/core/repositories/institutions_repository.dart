import '../network/api_client.dart';

class InstitutionsRepository {
  final ApiClient _api;

  InstitutionsRepository(this._api);

  Future<List<Map<String, dynamic>>> getInstitutions({
    String? search,
    String? type,
    String? city,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _api.dio.get('/institutions', queryParameters: {
      if (search != null) 'search': search,
      if (type != null) 'type': type,
      if (city != null) 'city': city,
      'page': page,
      'limit': limit,
    });
    final data = response.data;
    final list = (data is Map<String, dynamic> ? data['data'] as List? : data as List?) ?? [];
    return list.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> getInstitutionById(String id) async {
    final response = await _api.dio.get('/institutions/$id');
    return response.data as Map<String, dynamic>;
  }
}
