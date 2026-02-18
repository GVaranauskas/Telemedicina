import '../network/api_client.dart';
import '../models/chat_model.dart';

class ChatRepository {
  final ApiClient _api;

  ChatRepository(this._api);

  Future<List<ChatModel>> getConversations({int limit = 20}) async {
    final response = await _api.dio
        .get('/chat/conversations', queryParameters: {'limit': limit});
    final list = response.data as List? ?? [];
    return list.map((e) => ChatModel.fromJson(e)).toList();
  }

  Future<List<MessageModel>> getMessages(String chatId,
      {int limit = 50, String? before}) async {
    final response =
        await _api.dio.get('/chat/$chatId/messages', queryParameters: {
      'limit': limit,
      if (before != null) 'before': before,
    });
    final list = response.data as List? ?? [];
    return list.map((e) => MessageModel.fromJson(e)).toList();
  }
}
