class WorkplaceModel {
  final String id;
  final String name;
  final String? phone;
  final String street;
  final String number;
  final String? complement;
  final String neighborhood;
  final String city;
  final String state;
  final String zipCode;
  final double latitude;
  final double longitude;

  WorkplaceModel({
    required this.id,
    required this.name,
    this.phone,
    required this.street,
    required this.number,
    this.complement,
    required this.neighborhood,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.latitude,
    required this.longitude,
  });

  factory WorkplaceModel.fromJson(Map<String, dynamic> json) {
    return WorkplaceModel(
      id: json['id'],
      name: json['name'] ?? '',
      phone: json['phone'],
      street: json['street'] ?? '',
      number: json['number'] ?? '',
      complement: json['complement'],
      neighborhood: json['neighborhood'] ?? '',
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      zipCode: json['zipCode'] ?? '',
      latitude: (json['latitude'] ?? 0).toDouble(),
      longitude: (json['longitude'] ?? 0).toDouble(),
    );
  }

  String get fullAddress =>
      '$street, $number${complement != null ? ' - $complement' : ''}, $neighborhood, $city/$state - CEP $zipCode';

  String get shortAddress => '$neighborhood, $city/$state';
}

class DoctorMatchResult {
  final DoctorSummary doctor;
  final WorkplaceModel workplace;
  final double distanceKm;
  final List<String> availableSlots;
  final String? date;

  DoctorMatchResult({
    required this.doctor,
    required this.workplace,
    required this.distanceKm,
    required this.availableSlots,
    this.date,
  });

  factory DoctorMatchResult.fromJson(Map<String, dynamic> json) {
    return DoctorMatchResult(
      doctor: DoctorSummary.fromJson(json['doctor']),
      workplace: WorkplaceModel.fromJson(json['workplace']),
      distanceKm: (json['distanceKm'] ?? 0).toDouble(),
      availableSlots: List<String>.from(json['availableSlots'] ?? []),
      date: json['date'],
    );
  }
}

class DoctorSummary {
  final String id;
  final String fullName;
  final String? crm;
  final String? crmState;
  final String? profilePicUrl;
  final List<String> specialties;

  DoctorSummary({
    required this.id,
    required this.fullName,
    this.crm,
    this.crmState,
    this.profilePicUrl,
    this.specialties = const [],
  });

  factory DoctorSummary.fromJson(Map<String, dynamic> json) {
    return DoctorSummary(
      id: json['id'],
      fullName: json['fullName'] ?? '',
      crm: json['crm'],
      crmState: json['crmState'],
      profilePicUrl: json['profilePicUrl'],
      specialties: List<String>.from(json['specialties'] ?? []),
    );
  }

  String get crmFormatted => crm != null ? 'CRM $crm/$crmState' : '';
}

class AppointmentModel {
  final String id;
  final String patientId;
  final String doctorId;
  final String workplaceId;
  final DateTime scheduledAt;
  final int durationMin;
  final String type;
  final String status;
  final String? reason;
  final String? notes;
  final DateTime? cancelledAt;
  final String? cancelReason;
  final DoctorSummary? doctor;
  final WorkplaceModel? workplace;

  AppointmentModel({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.workplaceId,
    required this.scheduledAt,
    required this.durationMin,
    required this.type,
    required this.status,
    this.reason,
    this.notes,
    this.cancelledAt,
    this.cancelReason,
    this.doctor,
    this.workplace,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: json['id'],
      patientId: json['patientId'],
      doctorId: json['doctorId'],
      workplaceId: json['workplaceId'],
      scheduledAt: DateTime.parse(json['scheduledAt']),
      durationMin: json['durationMin'] ?? 30,
      type: json['type'] ?? 'PRESENCIAL',
      status: json['status'] ?? 'PENDING',
      reason: json['reason'],
      notes: json['notes'],
      cancelledAt: json['cancelledAt'] != null
          ? DateTime.parse(json['cancelledAt'])
          : null,
      cancelReason: json['cancelReason'],
      doctor: json['doctor'] != null
          ? DoctorSummary.fromJson(json['doctor'])
          : null,
      workplace: json['workplace'] != null
          ? WorkplaceModel.fromJson(json['workplace'])
          : null,
    );
  }

  bool get isPending => status == 'PENDING';
  bool get isConfirmed => status == 'CONFIRMED';
  bool get isCancelled =>
      status == 'CANCELLED_BY_PATIENT' || status == 'CANCELLED_BY_DOCTOR';
  bool get isCompleted => status == 'COMPLETED';
  bool get isUpcoming =>
      (isPending || isConfirmed) && scheduledAt.isAfter(DateTime.now());

  String get statusDisplay {
    switch (status) {
      case 'PENDING':
        return 'Aguardando confirmacao';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'CANCELLED_BY_PATIENT':
        return 'Cancelada por voce';
      case 'CANCELLED_BY_DOCTOR':
        return 'Cancelada pelo medico';
      case 'COMPLETED':
        return 'Realizada';
      case 'NO_SHOW':
        return 'Nao compareceu';
      default:
        return status;
    }
  }

  String get typeDisplay => type == 'TELEMEDICINA' ? 'Telemedicina' : 'Presencial';
}
