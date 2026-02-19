class PatientModel {
  final String id;
  final String userId;
  final String fullName;
  final String? cpf;
  final String? phone;
  final String? profilePicUrl;
  final String? city;
  final String? state;
  final DateTime dateOfBirth;
  final String? gender;
  final String? bloodType;
  final List<String> allergies;
  final List<String> medications;
  final DateTime createdAt;
  final DateTime updatedAt;

  PatientModel({
    required this.id,
    required this.userId,
    required this.fullName,
    this.cpf,
    this.phone,
    this.profilePicUrl,
    this.city,
    this.state,
    required this.dateOfBirth,
    this.gender,
    this.bloodType,
    this.allergies = const [],
    this.medications = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory PatientModel.fromJson(Map<String, dynamic> json) {
    return PatientModel(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      fullName: json['fullName'] ?? '',
      cpf: json['cpf'],
      phone: json['phone'],
      profilePicUrl: json['profilePicUrl'],
      city: json['city'],
      state: json['state'],
      dateOfBirth: json['dateOfBirth'] != null
          ? DateTime.parse(json['dateOfBirth'])
          : DateTime(1990, 1, 1),
      gender: json['gender'],
      bloodType: json['bloodType'],
      allergies: (json['allergies'] as List?)?.cast<String>() ?? [],
      medications: (json['medications'] as List?)?.cast<String>() ?? [],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : DateTime.now(),
    );
  }

  String get cpfFormatted {
    if (cpf == null || cpf!.length != 11) return cpf ?? '';
    return '${cpf!.substring(0, 3)}.${cpf!.substring(3, 6)}.${cpf!.substring(6, 9)}-${cpf!.substring(9)}';
  }

  String get initials {
    final parts = fullName.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return fullName.substring(0, 1).toUpperCase();
  }
}