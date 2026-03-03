import '../network/api_client.dart';

class DiscoverRepository {
  final ApiClient _api;

  DiscoverRepository(this._api);

  Future<Map<String, dynamic>> getTrending({int limit = 20}) async {
    try {
      final response = await _api.dio.get('/feed/trending', queryParameters: {'limit': limit});
      return response.data as Map<String, dynamic>? ?? {'tags': [], 'topPosts': []};
    } catch (_) {
      return {'tags': [], 'topPosts': []};
    }
  }

  Future<List<Map<String, dynamic>>> getInfluentialDoctors({int limit = 8}) async {
    try {
      final response = await _api.dio.get('/graph/influential', queryParameters: {'limit': limit});
      final list = response.data as List? ?? [];
      return list.cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }
}
