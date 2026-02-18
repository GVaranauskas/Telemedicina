class DoctorModel {
  final String id;
  final String userId;
  final String fullName;
  final String crm;
  final String crmState;
  final bool crmVerified;
  final String? phone;
  final String? bio;
  final String? profilePicUrl;
  final int? graduationYear;
  final String? universityName;
  final String? city;
  final String? state;
  final double? latitude;
  final double? longitude;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<DoctorSpecialty> specialties;
  final List<DoctorSkill> skills;
  final List<DoctorExperience> experiences;

  DoctorModel({
    required this.id,
    required this.userId,
    required this.fullName,
    required this.crm,
    required this.crmState,
    this.crmVerified = false,
    this.phone,
    this.bio,
    this.profilePicUrl,
    this.graduationYear,
    this.universityName,
    this.city,
    this.state,
    this.latitude,
    this.longitude,
    required this.createdAt,
    required this.updatedAt,
    this.specialties = const [],
    this.skills = const [],
    this.experiences = const [],
  });

  factory DoctorModel.fromJson(Map<String, dynamic> json) {
    return DoctorModel(
      id: json['id'],
      userId: json['userId'],
      fullName: json['fullName'],
      crm: json['crm'],
      crmState: json['crmState'],
      crmVerified: json['crmVerified'] ?? false,
      phone: json['phone'],
      bio: json['bio'],
      profilePicUrl: json['profilePicUrl'],
      graduationYear: json['graduationYear'],
      universityName: json['universityName'],
      city: json['city'],
      state: json['state'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      specialties: (json['specialties'] as List?)
              ?.map((e) => DoctorSpecialty.fromJson(e))
              .toList() ??
          [],
      skills: (json['skills'] as List?)
              ?.map((e) => DoctorSkill.fromJson(e))
              .toList() ??
          [],
      experiences: (json['experiences'] as List?)
              ?.map((e) => DoctorExperience.fromJson(e))
              .toList() ??
          [],
    );
  }

  String get crmFormatted => 'CRM $crm/$crmState';
}

class DoctorSpecialty {
  final String id;
  final String specialtyId;
  final String? name;
  final bool isPrimary;
  final String? rqeNumber;

  DoctorSpecialty({
    required this.id,
    required this.specialtyId,
    this.name,
    this.isPrimary = false,
    this.rqeNumber,
  });

  factory DoctorSpecialty.fromJson(Map<String, dynamic> json) {
    return DoctorSpecialty(
      id: json['id'] ?? '',
      specialtyId: json['specialtyId'] ?? json['specialty']?['id'] ?? '',
      name: json['specialty']?['name'] ?? json['name'],
      isPrimary: json['isPrimary'] ?? false,
      rqeNumber: json['rqeNumber'],
    );
  }
}

class DoctorSkill {
  final String id;
  final String skillId;
  final String? name;

  DoctorSkill({required this.id, required this.skillId, this.name});

  factory DoctorSkill.fromJson(Map<String, dynamic> json) {
    return DoctorSkill(
      id: json['id'] ?? '',
      skillId: json['skillId'] ?? json['skill']?['id'] ?? '',
      name: json['skill']?['name'] ?? json['name'],
    );
  }
}

class DoctorExperience {
  final String id;
  final String role;
  final String? institutionId;
  final String? description;
  final String startDate;
  final String? endDate;
  final bool isCurrent;

  DoctorExperience({
    required this.id,
    required this.role,
    this.institutionId,
    this.description,
    required this.startDate,
    this.endDate,
    this.isCurrent = false,
  });

  factory DoctorExperience.fromJson(Map<String, dynamic> json) {
    return DoctorExperience(
      id: json['id'],
      role: json['role'],
      institutionId: json['institutionId'],
      description: json['description'],
      startDate: json['startDate'],
      endDate: json['endDate'],
      isCurrent: json['isCurrent'] ?? false,
    );
  }
}

class Specialty {
  final String id;
  final String name;
  final String? description;

  Specialty({required this.id, required this.name, this.description});

  factory Specialty.fromJson(Map<String, dynamic> json) {
    return Specialty(
      id: json['id'],
      name: json['name'],
      description: json['description'],
    );
  }
}

class Skill {
  final String id;
  final String name;
  final String? category;

  Skill({required this.id, required this.name, this.category});

  factory Skill.fromJson(Map<String, dynamic> json) {
    return Skill(
      id: json['id'],
      name: json['name'],
      category: json['category'],
    );
  }
}
