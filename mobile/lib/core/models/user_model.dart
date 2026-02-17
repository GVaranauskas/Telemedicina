class AuthResponse {
  final UserModel user;
  final String accessToken;
  final String refreshToken;

  AuthResponse({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      user: UserModel.fromJson(json['user']),
      accessToken: json['accessToken'],
      refreshToken: json['refreshToken'],
    );
  }
}

class UserModel {
  final String id;
  final String email;
  final String role;
  final String? doctorId;
  final String? fullName;

  UserModel({
    required this.id,
    required this.email,
    required this.role,
    this.doctorId,
    this.fullName,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      role: json['role'],
      doctorId: json['doctorId'],
      fullName: json['fullName'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'role': role,
        'doctorId': doctorId,
        'fullName': fullName,
      };
}
