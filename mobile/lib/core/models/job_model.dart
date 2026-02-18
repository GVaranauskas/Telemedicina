class JobModel {
  final String id;
  final String title;
  final String type;
  final String description;
  final String? requirements;
  final double? salaryMin;
  final double? salaryMax;
  final String shift;
  final String city;
  final String state;
  final bool isActive;
  final String? institutionId;
  final String? institutionName;
  final String? specialtyId;
  final DateTime createdAt;
  final DateTime? expiresAt;

  JobModel({
    required this.id,
    required this.title,
    required this.type,
    this.description = '',
    this.requirements,
    this.salaryMin,
    this.salaryMax,
    required this.shift,
    required this.city,
    this.state = '',
    this.isActive = true,
    this.institutionId,
    this.institutionName,
    this.specialtyId,
    required this.createdAt,
    this.expiresAt,
  });

  factory JobModel.fromJson(Map<String, dynamic> json) {
    return JobModel(
      id: json['id'] ?? json['jobId'] ?? '',
      title: json['title'] ?? '',
      type: json['type'] ?? 'PLANTAO',
      description: json['description'] ?? '',
      requirements: json['requirements'],
      salaryMin: json['salaryMin']?.toDouble(),
      salaryMax: json['salaryMax']?.toDouble(),
      shift: json['shift'] ?? 'FLEXIVEL',
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      isActive: json['isActive'] ?? true,
      institutionId: json['institutionId'],
      institutionName: json['institution']?['name'] ?? json['institutionName'],
      specialtyId: json['specialtyId'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      expiresAt:
          json['expiresAt'] != null ? DateTime.parse(json['expiresAt']) : null,
    );
  }

  String get salaryFormatted {
    if (salaryMin == null) return 'A combinar';
    final min = 'R\$ ${salaryMin!.toStringAsFixed(0)}';
    if (salaryMax != null) return '$min - R\$ ${salaryMax!.toStringAsFixed(0)}';
    return min;
  }
}

class JobApplicationModel {
  final String id;
  final String jobId;
  final String doctorId;
  final String? coverLetter;
  final String status;
  final DateTime appliedAt;
  final JobModel? job;

  JobApplicationModel({
    required this.id,
    required this.jobId,
    required this.doctorId,
    this.coverLetter,
    required this.status,
    required this.appliedAt,
    this.job,
  });

  factory JobApplicationModel.fromJson(Map<String, dynamic> json) {
    return JobApplicationModel(
      id: json['id'],
      jobId: json['jobId'],
      doctorId: json['doctorId'],
      coverLetter: json['coverLetter'],
      status: json['status'],
      appliedAt: DateTime.parse(json['appliedAt'] ?? json['createdAt']),
      job: json['job'] != null ? JobModel.fromJson(json['job']) : null,
    );
  }
}
