import '../network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/api_provider.dart';

class AgendaItem {
  final String id;
  final String type; // 'APPOINTMENT' | 'SHIFT' | 'BLOCK'
  final DateTime date;
  final String? startTime;
  final String? endTime;
  final String? status;
  final String? shiftType;
  final String? blockType;
  final String? reason;
  final Map<String, dynamic>? patient;
  final Map<String, dynamic>? workplace;
  final Map<String, dynamic>? institution;
  final Map<String, dynamic>? department;

  AgendaItem({
    required this.id,
    required this.type,
    required this.date,
    this.startTime,
    this.endTime,
    this.status,
    this.shiftType,
    this.blockType,
    this.reason,
    this.patient,
    this.workplace,
    this.institution,
    this.department,
  });

  factory AgendaItem.fromJson(Map<String, dynamic> json) {
    return AgendaItem(
      id: json['id'],
      type: json['type'],
      date: DateTime.parse(json['date'] ?? json['scheduledAt'] ?? json['startDate']),
      startTime: json['startTime'],
      endTime: json['endTime'],
      status: json['status'],
      shiftType: json['shiftType'],
      blockType: json['blockType'],
      reason: json['reason'],
      patient: json['patient'],
      workplace: json['workplace'],
      institution: json['institution'],
      department: json['department'],
    );
  }

  bool get isAppointment => type == 'APPOINTMENT';
  bool get isShift => type == 'SHIFT';
  bool get isBlock => type == 'BLOCK';
}

class DoctorAgendaData {
  final List<AgendaItem> appointments;
  final List<AgendaItem> shifts;
  final List<AgendaItem> blocks;

  const DoctorAgendaData({
    required this.appointments,
    required this.shifts,
    required this.blocks,
  });

  List<AgendaItem> get allItems => [
    ...appointments,
    ...shifts,
    ...blocks,
  ]..sort((a, b) => a.date.compareTo(b.date));

  List<AgendaItem> itemsForDate(DateTime date) {
    final d = DateTime(date.year, date.month, date.day);
    return allItems.where((item) {
      final itemDate = DateTime(item.date.year, item.date.month, item.date.day);
      return itemDate == d;
    }).toList();
  }

  bool hasItemsOnDate(DateTime date) => itemsForDate(date).isNotEmpty;
}

class AgendaRepository {
  final ApiClient _client;

  AgendaRepository(this._client);

  Future<DoctorAgendaData> getAgenda({DateTime? from, DateTime? to}) async {
    final fromStr = (from ?? DateTime.now()).toIso8601String();
    final toStr = (to ?? DateTime.now().add(const Duration(days: 30))).toIso8601String();

    final res = await _client.dio.get(
      '/doctors/me/agenda',
      queryParameters: {'from': fromStr, 'to': toStr},
    );

    final data = res.data as Map<String, dynamic>;

    return DoctorAgendaData(
      appointments: (data['appointments'] as List? ?? [])
          .map((a) => AgendaItem.fromJson({...a, 'type': 'APPOINTMENT', 'date': a['date'] ?? a['scheduledAt']}))
          .toList(),
      shifts: (data['shifts'] as List? ?? [])
          .map((s) => AgendaItem.fromJson({...s, 'type': 'SHIFT'}))
          .toList(),
      blocks: (data['blocks'] as List? ?? [])
          .map((b) => AgendaItem.fromJson({...b, 'type': 'BLOCK', 'date': b['startDate']}))
          .toList(),
    );
  }
}

final agendaRepositoryProvider = Provider<AgendaRepository>((ref) {
  return AgendaRepository(ref.watch(apiClientProvider));
});

class AgendaState {
  final bool isLoading;
  final DoctorAgendaData? data;
  final String? error;

  const AgendaState({this.isLoading = false, this.data, this.error});

  AgendaState copyWith({bool? isLoading, DoctorAgendaData? data, String? error}) {
    return AgendaState(
      isLoading: isLoading ?? this.isLoading,
      data: data ?? this.data,
      error: error,
    );
  }
}

class AgendaNotifier extends StateNotifier<AgendaState> {
  final AgendaRepository _repo;

  AgendaNotifier(this._repo) : super(const AgendaState());

  Future<void> loadAgenda() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _repo.getAgenda(
        from: DateTime.now(),
        to: DateTime.now().add(const Duration(days: 30)),
      );
      state = state.copyWith(isLoading: false, data: data);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final agendaProvider = StateNotifierProvider<AgendaNotifier, AgendaState>((ref) {
  return AgendaNotifier(ref.watch(agendaRepositoryProvider));
});
