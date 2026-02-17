import '../network/api_client.dart';
import '../models/connection_model.dart';

class ConnectionRepository {
  final ApiClient _api;

  ConnectionRepository(this._api);

  Future<List<ConnectionModel>> getMyConnections() async {
    final response = await _api.dio.get('/connections/me');
    final list = response.data as List? ?? [];
    return list.map((e) => ConnectionModel.fromJson(e)).toList();
  }

  Future<List<ConnectionRequestModel>> getPendingRequests() async {
    final response = await _api.dio.get('/connections/pending');
    final list = response.data as List? ?? [];
    return list.map((e) => ConnectionRequestModel.fromJson(e)).toList();
  }

  Future<List<ConnectionSuggestion>> getSuggestions({int limit = 10}) async {
    final response = await _api.dio
        .get('/connections/suggestions', queryParameters: {'limit': limit});
    final list = response.data as List? ?? [];
    return list.map((e) => ConnectionSuggestion.fromJson(e)).toList();
  }

  Future<void> sendRequest(String receiverId) async {
    await _api.dio.post('/connections/request/$receiverId');
  }

  Future<void> acceptRequest(String requestId) async {
    await _api.dio.post('/connections/accept/$requestId');
  }

  Future<void> rejectRequest(String requestId) async {
    await _api.dio.post('/connections/reject/$requestId');
  }

  Future<void> removeConnection(String otherDoctorId) async {
    await _api.dio.delete('/connections/$otherDoctorId');
  }

  Future<void> follow(String targetId) async {
    await _api.dio.post('/connections/follow/$targetId');
  }

  Future<void> unfollow(String targetId) async {
    await _api.dio.delete('/connections/follow/$targetId');
  }

  Future<List<ConnectionModel>> getFollowers() async {
    final response = await _api.dio.get('/connections/followers');
    final list = response.data as List? ?? [];
    return list.map((e) => ConnectionModel.fromJson(e)).toList();
  }

  Future<List<ConnectionModel>> getFollowing() async {
    final response = await _api.dio.get('/connections/following');
    final list = response.data as List? ?? [];
    return list.map((e) => ConnectionModel.fromJson(e)).toList();
  }
}
