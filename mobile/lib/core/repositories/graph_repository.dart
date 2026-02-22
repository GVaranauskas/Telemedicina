import '../network/api_client.dart';

class GraphRepository {
  final ApiClient _api;

  GraphRepository(this._api);

  Future<List<Map<String, dynamic>>> getInfluentialDoctors({int limit = 10}) async {
    final response = await _api.dio
        .get('/graph/influential', queryParameters: {'limit': limit});
    final list = response.data as List? ?? [];
    return list.cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getBridgeDoctors({int limit = 10}) async {
    final response = await _api.dio
        .get('/graph/bridges', queryParameters: {'limit': limit});
    final list = response.data as List? ?? [];
    return list.cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getCommunities() async {
    final response = await _api.dio.get('/graph/communities');
    final list = response.data as List? ?? [];
    return list.cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getSimilarDoctors(String doctorId, {int limit = 10}) async {
    final response = await _api.dio
        .get('/graph/similar/$doctorId', queryParameters: {'limit': limit});
    final list = response.data as List? ?? [];
    return list.cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getCommunityPeers({int limit = 10}) async {
    final response = await _api.dio
        .get('/graph/community-peers', queryParameters: {'limit': limit});
    final list = response.data as List? ?? [];
    return list.cast<Map<String, dynamic>>();
  }
}
