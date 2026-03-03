import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../providers/api_provider.dart';
import '../providers/auth_provider.dart';

class InstitutionKpis {
  final int activeContracts;
  final int openJobs;
  final int shiftsNext7Days;
  final int coveredShifts;
  final int uncoveredShifts;
  final int coverageRate;
  final int pendingFollowUps;

  const InstitutionKpis({
    required this.activeContracts,
    required this.openJobs,
    required this.shiftsNext7Days,
    required this.coveredShifts,
    required this.uncoveredShifts,
    required this.coverageRate,
    required this.pendingFollowUps,
  });

  factory InstitutionKpis.fromJson(Map<String, dynamic> json) {
    return InstitutionKpis(
      activeContracts: json['activeContracts'] ?? 0,
      openJobs: json['openJobs'] ?? 0,
      shiftsNext7Days: json['shiftsNext7Days'] ?? 0,
      coveredShifts: json['coveredShifts'] ?? 0,
      uncoveredShifts: json['uncoveredShifts'] ?? 0,
      coverageRate: json['coverageRate'] ?? 0,
      pendingFollowUps: json['pendingFollowUps'] ?? 0,
    );
  }
}

class WorkforceDoctor {
  final String id;
  final String fullName;
  final String? crm;
  final String? city;
  final String? profilePicUrl;
  final List<String> specialties;
  final bool hasActiveContract;
  final String? lastContactOutcome;
  final bool isAvailableOnDate;

  const WorkforceDoctor({
    required this.id,
    required this.fullName,
    this.crm,
    this.city,
    this.profilePicUrl,
    required this.specialties,
    required this.hasActiveContract,
    this.lastContactOutcome,
    required this.isAvailableOnDate,
  });

  factory WorkforceDoctor.fromJson(Map<String, dynamic> json) {
    return WorkforceDoctor(
      id: json['id'],
      fullName: json['fullName'],
      crm: json['crm'],
      city: json['city'],
      profilePicUrl: json['profilePicUrl'],
      specialties: (json['specialties'] as List? ?? []).cast<String>(),
      hasActiveContract: json['hasActiveContract'] ?? false,
      lastContactOutcome: json['lastContactOutcome'],
      isAvailableOnDate: json['isAvailableOnDate'] ?? true,
    );
  }
}

class ShiftAssignment {
  final String id;
  final DateTime date;
  final String startTime;
  final String endTime;
  final String shiftType;
  final String status;
  final Map<String, dynamic>? doctor;
  final Map<String, dynamic>? department;

  const ShiftAssignment({
    required this.id,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.shiftType,
    required this.status,
    this.doctor,
    this.department,
  });

  factory ShiftAssignment.fromJson(Map<String, dynamic> json) {
    return ShiftAssignment(
      id: json['id'],
      date: DateTime.parse(json['date']),
      startTime: json['startTime'],
      endTime: json['endTime'],
      shiftType: json['shiftType'],
      status: json['status'],
      doctor: json['doctor'],
      department: json['department'],
    );
  }
}

class ContractModel {
  final String id;
  final String type;
  final String status;
  final DateTime startDate;
  final DateTime? endDate;
  final double? hourlyRate;
  final double? monthlyRate;
  final Map<String, dynamic>? doctor;
  final Map<String, dynamic>? specialty;

  const ContractModel({
    required this.id,
    required this.type,
    required this.status,
    required this.startDate,
    this.endDate,
    this.hourlyRate,
    this.monthlyRate,
    this.doctor,
    this.specialty,
  });

  factory ContractModel.fromJson(Map<String, dynamic> json) {
    return ContractModel(
      id: json['id'],
      type: json['type'],
      status: json['status'],
      startDate: DateTime.parse(json['startDate']),
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
      hourlyRate: (json['hourlyRate'] as num?)?.toDouble(),
      monthlyRate: (json['monthlyRate'] as num?)?.toDouble(),
      doctor: json['doctor'],
      specialty: json['specialty'],
    );
  }
}

class ContactLogModel {
  final String id;
  final String type;
  final String outcome;
  final String? notes;
  final DateTime? followUpDate;
  final DateTime createdAt;
  final Map<String, dynamic>? doctor;

  const ContactLogModel({
    required this.id,
    required this.type,
    required this.outcome,
    this.notes,
    this.followUpDate,
    required this.createdAt,
    this.doctor,
  });

  factory ContactLogModel.fromJson(Map<String, dynamic> json) {
    return ContactLogModel(
      id: json['id'],
      type: json['type'],
      outcome: json['outcome'],
      notes: json['notes'],
      followUpDate: json['followUpDate'] != null ? DateTime.parse(json['followUpDate']) : null,
      createdAt: DateTime.parse(json['createdAt']),
      doctor: json['doctor'],
    );
  }
}

class InstitutionWorkforceRepository {
  final ApiClient _client;

  InstitutionWorkforceRepository(this._client);

  Future<InstitutionKpis> getDashboard(String institutionId) async {
    final res = await _client.dio.get('/institutions/$institutionId/workforce/dashboard');
    return InstitutionKpis.fromJson(res.data);
  }

  Future<List<WorkforceDoctor>> searchWorkforce(String institutionId, {
    String? specialtyName,
    String? city,
    DateTime? date,
  }) async {
    final res = await _client.dio.get(
      '/institutions/$institutionId/workforce/search',
      queryParameters: {
        if (specialtyName != null) 'specialtyName': specialtyName,
        if (city != null) 'city': city,
        if (date != null) 'date': date.toIso8601String(),
        'limit': 20,
      },
    );
    return (res.data as List).map((d) => WorkforceDoctor.fromJson(d)).toList();
  }

  Future<Map<String, dynamic>> getRoster(String institutionId, {DateTime? from, DateTime? to}) async {
    final res = await _client.dio.get(
      '/institutions/$institutionId/workforce/roster',
      queryParameters: {
        'from': (from ?? DateTime.now()).toIso8601String(),
        'to': (to ?? DateTime.now().add(const Duration(days: 7))).toIso8601String(),
      },
    );
    return res.data as Map<String, dynamic>;
  }

  Future<List<ContractModel>> getContracts(String institutionId, {String? status}) async {
    final res = await _client.dio.get(
      '/institutions/$institutionId/workforce/contracts',
      queryParameters: { if (status != null) 'status': status },
    );
    return (res.data as List).map((c) => ContractModel.fromJson(c)).toList();
  }

  Future<List<ContactLogModel>> getContactLogs(String institutionId) async {
    final res = await _client.dio.get('/institutions/$institutionId/workforce/contacts');
    return (res.data as List).map((c) => ContactLogModel.fromJson(c)).toList();
  }

  Future<List<ContactLogModel>> getFollowUps(String institutionId) async {
    final res = await _client.dio.get('/institutions/$institutionId/workforce/contacts/follow-ups');
    return (res.data as List).map((c) => ContactLogModel.fromJson(c)).toList();
  }

  Future<void> logContact(String institutionId, {
    required String doctorId,
    required String type,
    required String outcome,
    String? notes,
    DateTime? followUpDate,
  }) async {
    await _client.dio.post('/institutions/$institutionId/workforce/contacts', data: {
      'doctorId': doctorId,
      'type': type,
      'outcome': outcome,
      if (notes != null) 'notes': notes,
      if (followUpDate != null) 'followUpDate': followUpDate.toIso8601String(),
    });
  }
}

final institutionWorkforceRepositoryProvider = Provider<InstitutionWorkforceRepository>((ref) {
  return InstitutionWorkforceRepository(ref.watch(apiClientProvider));
});

// ─── Institution Dashboard State ─────────────────────────────────────────────

class InstitutionDashboardState {
  final bool isLoading;
  final InstitutionKpis? kpis;
  final List<WorkforceDoctor> searchResults;
  final List<ContractModel> contracts;
  final List<ContactLogModel> contactLogs;
  final List<ContactLogModel> followUps;
  final String? error;

  const InstitutionDashboardState({
    this.isLoading = false,
    this.kpis,
    this.searchResults = const [],
    this.contracts = const [],
    this.contactLogs = const [],
    this.followUps = const [],
    this.error,
  });

  InstitutionDashboardState copyWith({
    bool? isLoading,
    InstitutionKpis? kpis,
    List<WorkforceDoctor>? searchResults,
    List<ContractModel>? contracts,
    List<ContactLogModel>? contactLogs,
    List<ContactLogModel>? followUps,
    String? error,
  }) {
    return InstitutionDashboardState(
      isLoading: isLoading ?? this.isLoading,
      kpis: kpis ?? this.kpis,
      searchResults: searchResults ?? this.searchResults,
      contracts: contracts ?? this.contracts,
      contactLogs: contactLogs ?? this.contactLogs,
      followUps: followUps ?? this.followUps,
      error: error,
    );
  }
}

class InstitutionDashboardNotifier extends StateNotifier<InstitutionDashboardState> {
  final InstitutionWorkforceRepository _repo;
  final String institutionId;

  InstitutionDashboardNotifier(this._repo, this.institutionId)
      : super(const InstitutionDashboardState());

  Future<void> loadAll() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        _repo.getDashboard(institutionId),
        _repo.getContracts(institutionId),
        _repo.getFollowUps(institutionId),
      ]);
      state = state.copyWith(
        isLoading: false,
        kpis: results[0] as InstitutionKpis,
        contracts: results[1] as List<ContractModel>,
        followUps: results[2] as List<ContactLogModel>,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> searchWorkforce({String? specialtyName, String? city}) async {
    try {
      final results = await _repo.searchWorkforce(institutionId,
          specialtyName: specialtyName, city: city);
      state = state.copyWith(searchResults: results);
    } catch (e) {
      // silently fail search
    }
  }
}

final institutionDashboardProvider = StateNotifierProvider.family<
    InstitutionDashboardNotifier, InstitutionDashboardState, String>((ref, institutionId) {
  return InstitutionDashboardNotifier(
    ref.watch(institutionWorkforceRepositoryProvider),
    institutionId,
  );
});

final institutionIdProvider = Provider<String?>((ref) {
  final auth = ref.watch(authProvider);
  return auth.user?.institutionId;
});
