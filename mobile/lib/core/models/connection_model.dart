class ConnectionModel {
  final String id;
  final String fullName;
  final String? profilePicUrl;
  final String crm;
  final String crmState;
  final String? primarySpecialty;
  final String? city;
  final String? state;

  ConnectionModel({
    required this.id,
    required this.fullName,
    this.profilePicUrl,
    required this.crm,
    required this.crmState,
    this.primarySpecialty,
    this.city,
    this.state,
  });

  factory ConnectionModel.fromJson(Map<String, dynamic> json) {
    // Handle both flat and nested response shapes
    final doctor = json['doctor'] ?? json['sender'] ?? json['receiver'] ?? json;
    return ConnectionModel(
      id: doctor['id'] ?? json['id'] ?? '',
      fullName: doctor['fullName'] ?? json['fullName'] ?? '',
      profilePicUrl: doctor['profilePicUrl'] ?? json['profilePicUrl'],
      crm: doctor['crm'] ?? json['crm'] ?? '',
      crmState: doctor['crmState'] ?? json['crmState'] ?? '',
      primarySpecialty: _extractSpecialty(doctor),
      city: doctor['city'] ?? json['city'],
      state: doctor['state'] ?? json['state'],
    );
  }

  static String? _extractSpecialty(Map<String, dynamic> json) {
    final specialties = json['specialties'] as List?;
    if (specialties != null && specialties.isNotEmpty) {
      final primary = specialties.firstWhere(
        (s) => s['isPrimary'] == true,
        orElse: () => specialties.first,
      );
      return primary['specialty']?['name'] ?? primary['name'];
    }
    return json['specialty'] ?? json['primarySpecialty'];
  }

  String get locationFormatted =>
      [city, state].where((e) => e != null).join(', ');
}

class ConnectionRequestModel {
  final String id;
  final String senderId;
  final String receiverId;
  final String status;
  final ConnectionModel sender;
  final DateTime createdAt;

  ConnectionRequestModel({
    required this.id,
    required this.senderId,
    required this.receiverId,
    required this.status,
    required this.sender,
    required this.createdAt,
  });

  factory ConnectionRequestModel.fromJson(Map<String, dynamic> json) {
    return ConnectionRequestModel(
      id: json['id'],
      senderId: json['senderId'],
      receiverId: json['receiverId'],
      status: json['status'],
      sender: ConnectionModel.fromJson(json['sender'] ?? json),
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class ConnectionSuggestion {
  final String doctorId;
  final String fullName;
  final String? profilePicUrl;
  final int mutualConnections;
  final String? specialty;
  final String? reason;

  ConnectionSuggestion({
    required this.doctorId,
    required this.fullName,
    this.profilePicUrl,
    this.mutualConnections = 0,
    this.specialty,
    this.reason,
  });

  factory ConnectionSuggestion.fromJson(Map<String, dynamic> json) {
    return ConnectionSuggestion(
      doctorId: json['doctorId'] ?? json['id'] ?? '',
      fullName: json['fullName'] ?? json['name'] ?? '',
      profilePicUrl: json['profilePicUrl'],
      mutualConnections: json['mutualConnections'] ?? json['mutual'] ?? 0,
      specialty: json['specialty'],
      reason: json['reason'],
    );
  }
}
