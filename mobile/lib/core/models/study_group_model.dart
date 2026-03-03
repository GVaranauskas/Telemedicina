class StudyGroupModel {
  final String id;
  final String name;
  final String? description;
  final String? specialtyId;
  final String? specialtyName;
  final bool isPublic;
  final int? maxMembers;
  final int memberCount;
  final bool isMember;

  StudyGroupModel({
    required this.id,
    required this.name,
    this.description,
    this.specialtyId,
    this.specialtyName,
    this.isPublic = true,
    this.maxMembers,
    this.memberCount = 0,
    this.isMember = false,
  });

  factory StudyGroupModel.fromJson(Map<String, dynamic> json) {
    final specialty = json['specialty'] as Map<String, dynamic>?;
    final count = json['_count'] as Map<String, dynamic>?;

    return StudyGroupModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      specialtyId: specialty?['id'] as String?,
      specialtyName: specialty?['name'] as String?,
      isPublic: json['isPublic'] ?? true,
      maxMembers: json['maxMembers'],
      memberCount: json['memberCount'] ?? count?['members'] ?? 0,
      isMember: json['isMember'] ?? false,
    );
  }
}

class StudyGroupMemberModel {
  final String doctorId;
  final String role;
  final String firstName;
  final String lastName;
  final String? photoUrl;
  final String? crm;

  StudyGroupMemberModel({
    required this.doctorId,
    required this.role,
    required this.firstName,
    required this.lastName,
    this.photoUrl,
    this.crm,
  });

  String get fullName => '$firstName $lastName';

  factory StudyGroupMemberModel.fromJson(Map<String, dynamic> json) {
    final doctor = json['doctor'] as Map<String, dynamic>? ?? {};
    final fullName = doctor['fullName'] as String? ?? '';
    final parts = fullName.trim().split(' ');
    return StudyGroupMemberModel(
      doctorId: doctor['id'] ?? json['doctorId'] ?? '',
      role: json['role'] ?? 'MEMBER',
      firstName: parts.isNotEmpty ? parts.first : fullName,
      lastName: parts.length > 1 ? parts.last : '',
      photoUrl: doctor['profilePicUrl'] as String?,
      crm: doctor['crm'] as String?,
    );
  }
}
