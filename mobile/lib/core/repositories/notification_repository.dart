import '../network/api_client.dart';
import '../models/notification_model.dart';

class NotificationRepository {
  final ApiClient _api;

  NotificationRepository(this._api);

  Future<List<NotificationModel>> getNotifications({int limit = 30}) async {
    final response = await _api.dio
        .get('/notifications', queryParameters: {'limit': limit});
    final list = response.data as List? ?? [];
    return list.map((e) => NotificationModel.fromJson(e)).toList();
  }

  Future<int> getUnreadCount() async {
    final response = await _api.dio.get('/notifications/unread-count');
    return response.data['unreadCount'] ?? 0;
  }

  Future<void> markAsRead(String notificationId, String createdAt) async {
    await _api.dio.patch('/notifications/$notificationId/read', data: {
      'createdAt': createdAt,
    });
  }
}
