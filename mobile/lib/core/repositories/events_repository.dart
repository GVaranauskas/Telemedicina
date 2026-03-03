import '../network/api_client.dart';
import '../models/event_model.dart';

class EventsRepository {
  final ApiClient _api;

  EventsRepository(this._api);

  Future<List<EventModel>> getEvents({
    String? type,
    bool? isOnline,
    bool? isFree,
    String? specialty,
    String? city,
    String? dateFrom,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _api.dio.get('/events', queryParameters: {
      if (type != null) 'type': type,
      if (isOnline != null) 'isOnline': isOnline,
      if (isFree != null) 'isFree': isFree,
      if (specialty != null) 'specialty': specialty,
      if (city != null) 'city': city,
      if (dateFrom != null) 'dateFrom': dateFrom,
      'page': page,
      'limit': limit,
    });
    final data = response.data;
    final list = (data is Map<String, dynamic> ? data['data'] as List? : data as List?) ?? [];
    return list.map((e) => EventModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<EventModel> getEventById(String id) async {
    final response = await _api.dio.get('/events/$id');
    return EventModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> attend(String eventId) async {
    await _api.dio.post('/events/$eventId/attend');
  }

  Future<void> unattend(String eventId) async {
    await _api.dio.delete('/events/$eventId/attend');
  }

  Future<bool> isAttending(String eventId) async {
    final response = await _api.dio.get('/events/$eventId/attending');
    return (response.data as Map<String, dynamic>)['attending'] == true;
  }
}
