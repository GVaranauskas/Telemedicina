import '../network/api_client.dart';
import '../models/study_group_model.dart';

class StudyGroupsRepository {
  final ApiClient _api;

  StudyGroupsRepository(this._api);

  Future<List<StudyGroupModel>> getGroups({
    String? specialty,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _api.dio.get('/groups', queryParameters: {
      if (specialty != null) 'specialty': specialty,
      if (search != null) 'search': search,
      'page': page,
      'limit': limit,
    });
    final data = response.data;
    final list = (data is Map<String, dynamic> ? data['data'] as List? : data as List?) ?? [];
    return list.map((e) => StudyGroupModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> getGroupById(String id) async {
    final response = await _api.dio.get('/groups/$id');
    return response.data as Map<String, dynamic>;
  }

  Future<StudyGroupModel> createGroup({
    required String name,
    String? description,
    String? specialtyId,
    bool isPublic = true,
    int? maxMembers,
  }) async {
    final response = await _api.dio.post('/groups', data: {
      'name': name,
      if (description != null) 'description': description,
      if (specialtyId != null) 'specialtyId': specialtyId,
      'isPublic': isPublic,
      if (maxMembers != null) 'maxMembers': maxMembers,
    });
    return StudyGroupModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> joinGroup(String groupId) async {
    await _api.dio.post('/groups/$groupId/join');
  }

  Future<void> leaveGroup(String groupId) async {
    await _api.dio.delete('/groups/$groupId/leave');
  }
}
