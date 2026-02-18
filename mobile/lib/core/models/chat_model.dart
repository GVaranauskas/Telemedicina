class ChatModel {
  final String chatId;
  final String otherUserId;
  final String otherUserName;
  final String? otherUserPicUrl;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCount;

  ChatModel({
    required this.chatId,
    required this.otherUserId,
    required this.otherUserName,
    this.otherUserPicUrl,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
  });

  factory ChatModel.fromJson(Map<String, dynamic> json) {
    return ChatModel(
      chatId: json['chat_id'] ?? json['chatId'] ?? '',
      otherUserId: json['other_user_id'] ?? json['otherUserId'] ?? '',
      otherUserName:
          json['other_user_name'] ?? json['otherUserName'] ?? 'Médico',
      otherUserPicUrl:
          json['other_user_pic_url'] ?? json['otherUserPicUrl'],
      lastMessage: json['last_message'] ?? json['lastMessage'],
      lastMessageAt: json['last_message_at'] != null
          ? DateTime.parse(json['last_message_at'].toString())
          : json['lastMessageAt'] != null
              ? DateTime.parse(json['lastMessageAt'].toString())
              : null,
      unreadCount: json['unread_count'] ?? json['unreadCount'] ?? 0,
    );
  }
}

class MessageModel {
  final String messageId;
  final String chatId;
  final String senderId;
  final String content;
  final String messageType;
  final String? mediaUrl;
  final DateTime createdAt;

  MessageModel({
    required this.messageId,
    required this.chatId,
    required this.senderId,
    required this.content,
    this.messageType = 'TEXT',
    this.mediaUrl,
    required this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      messageId: json['message_id'] ?? json['messageId'] ?? '',
      chatId: json['chat_id'] ?? json['chatId'] ?? '',
      senderId: json['sender_id'] ?? json['senderId'] ?? '',
      content: json['content'] ?? '',
      messageType:
          json['message_type'] ?? json['messageType'] ?? 'TEXT',
      mediaUrl: json['media_url'] ?? json['mediaUrl'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : DateTime.now(),
    );
  }
}
