class PatientModel {
  final String id;
  final String userId;
  final String fullName;
  final String? cpf;
  final String? phone;
  final String? dateOfBirth;
  final String? gender;
  final String? profilePicUrl;
  final String? street;
  final String? number;
  final String? complement;
  final String? neighborhood;
  final String? city;
  final String? state;
  final String? zipCode;
  final double? latitude;
  final double? longitude;
  final DateTime createdAt;
  final DateTime updatedAt;

  PatientModel({
    required this.id,
    required this.userId,
    required this.fullName,
    this.cpf,
    this.phone,
    this.dateOfBirth,
    this.gender,
    this.profilePicUrl,
    this.street,
    this.number,
    this.complement,
    this.neighborhood,
    this.city,
    this.state,
    this.zipCode,
    this.latitude,
    this.longitude,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PatientModel.fromJson(Map<String, dynamic> json) {
    return PatientModel(
      id: json['id'],
      userId: json['userId'],
      fullName: json['fullName'],
      cpf: json['cpf'],
      phone: json['phone'],
      dateOfBirth: json['dateOfBirth'],
      gender: json['gender'],
      profilePicUrl: json['profilePicUrl'],
      street: json['street'],
      number: json['number'],
      complement: json['complement'],
      neighborhood: json['neighborhood'],
      city: json['city'],
      state: json['state'],
      zipCode: json['zipCode'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  String get locationFormatted {
    if (city != null && state != null) return '$city, $state';
    return city ?? state ?? '';
  }

  String get fullAddress {
    final parts = <String>[];
    if (street != null) parts.add('$street${number != null ? ', $number' : ''}');
    if (complement != null) parts.add(complement!);
    if (neighborhood != null) parts.add(neighborhood!);
    if (city != null) parts.add(city!);
    if (state != null) parts.add(state!);
    if (zipCode != null) parts.add('CEP $zipCode');
    return parts.join(' - ');
  }
}
