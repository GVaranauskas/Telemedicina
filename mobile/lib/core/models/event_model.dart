class EventModel {
  final String id;
  final String title;
  final String? description;
  final String eventType;
  final String status;
  final DateTime startDate;
  final DateTime? endDate;
  final String? location;
  final String? eventUrl;
  final int? maxAttendees;
  final int attendeeCount;
  final bool isOnline;
  final bool isFree;
  final double? price;
  final String? organizerName;
  final String? organizerLogoUrl;
  final List<String> specialties;
  final bool attending;

  EventModel({
    required this.id,
    required this.title,
    this.description,
    required this.eventType,
    this.status = 'UPCOMING',
    required this.startDate,
    this.endDate,
    this.location,
    this.eventUrl,
    this.maxAttendees,
    this.attendeeCount = 0,
    this.isOnline = false,
    this.isFree = true,
    this.price,
    this.organizerName,
    this.organizerLogoUrl,
    this.specialties = const [],
    this.attending = false,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    final organizer = json['organizer'] as Map<String, dynamic>? ?? {};
    final topics = (json['topics'] as List?)
            ?.map((t) => (t['topic']?['name'] ?? '') as String)
            .where((s) => s.isNotEmpty)
            .toList() ??
        [];

    return EventModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      eventType: json['eventType'] ?? 'CONGRESS',
      status: json['status'] ?? 'UPCOMING',
      startDate: json['startDate'] != null
          ? DateTime.tryParse(json['startDate'].toString()) ?? DateTime.now()
          : DateTime.now(),
      endDate: json['endDate'] != null
          ? DateTime.tryParse(json['endDate'].toString())
          : null,
      location: json['location'],
      eventUrl: json['eventUrl'],
      maxAttendees: json['maxAttendees'],
      attendeeCount: json['attendeeCount'] ?? json['_count']?['attendees'] ?? 0,
      isOnline: json['isOnline'] ?? false,
      isFree: json['isFree'] ?? true,
      price: (json['price'] as num?)?.toDouble(),
      organizerName: organizer['name'] as String?,
      organizerLogoUrl: organizer['logoUrl'] as String?,
      specialties: List<String>.from(topics),
      attending: json['attending'] ?? false,
    );
  }

  String get typeLabel {
    switch (eventType) {
      case 'CONGRESS':
        return 'Congresso';
      case 'SYMPOSIUM':
        return 'Simpósio';
      case 'WORKSHOP':
        return 'Workshop';
      case 'WEBINAR':
        return 'Webinar';
      case 'CONFERENCE':
        return 'Conferência';
      case 'MEETUP':
        return 'Meetup';
      default:
        return eventType;
    }
  }
}
