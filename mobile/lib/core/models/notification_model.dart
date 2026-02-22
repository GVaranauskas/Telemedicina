class NotificationModel {
  final String notificationId;
  final String type;
  final String title;
  final String body;
  final String? referenceId;
  final Map<String, dynamic>? data;
  bool isRead;
  final DateTime createdAt;

  NotificationModel({
    required this.notificationId,
    required this.type,
    required this.title,
    required this.body,
    this.referenceId,
    this.data,
    this.isRead = false,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    return NotificationModel(
      notificationId:
          json['notification_id'] ?? json['notificationId'] ?? '',
      type: json['type'] ?? '',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      referenceId: json['reference_id'] ?? json['referenceId'],
      data: rawData is Map<String, dynamic>
          ? rawData
          : rawData is Map
              ? Map<String, dynamic>.from(rawData)
              : null,
      isRead: json['is_read'] ?? json['isRead'] ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : json['createdAt'] != null
              ? DateTime.parse(json['createdAt'].toString())
              : DateTime.now(),
    );
  }
}
