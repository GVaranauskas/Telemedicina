import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_client.dart';

class WebSocketService {
  io.Socket? _socket;
  String? _userId;

  bool get isConnected => _socket?.connected ?? false;

  void connect(String userId) {
    if (_socket != null && _userId == userId) return;
    _userId = userId;

    final wsUrl = ApiClient.baseUrl.replaceAll('/api/v1', '');

    _socket = io.io(
      '$wsUrl/chat',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setQuery({'userId': userId})
          .disableAutoConnect()
          .build(),
    );

    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _userId = null;
  }

  void sendMessage({
    required String chatId,
    required String receiverId,
    required String content,
    String messageType = 'TEXT',
  }) {
    _socket?.emit('send_message', {
      'chatId': chatId,
      'receiverId': receiverId,
      'content': content,
      'messageType': messageType,
    });
  }

  void onNewMessage(void Function(dynamic data) callback) {
    _socket?.on('new_message', callback);
  }

  void onMessageSent(void Function(dynamic data) callback) {
    _socket?.on('message_sent', callback);
  }

  void onTyping(void Function(dynamic data) callback) {
    _socket?.on('user_typing', callback);
  }

  void sendTyping({required String chatId, required String receiverId}) {
    _socket?.emit('typing', {
      'chatId': chatId,
      'receiverId': receiverId,
    });
  }

  void removeListeners() {
    _socket?.off('new_message');
    _socket?.off('message_sent');
    _socket?.off('user_typing');
  }
}
