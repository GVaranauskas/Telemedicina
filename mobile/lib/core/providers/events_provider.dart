import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/event_model.dart';
import '../repositories/events_repository.dart';
import 'api_provider.dart';

// ─── State ────────────────────────────────────────────────────
class EventsState {
  final List<EventModel> events;
  final bool isLoading;
  final String? error;
  final String? typeFilter;
  final bool? onlineFilter;
  final bool? freeFilter;

  const EventsState({
    this.events = const [],
    this.isLoading = false,
    this.error,
    this.typeFilter,
    this.onlineFilter,
    this.freeFilter,
  });

  EventsState copyWith({
    List<EventModel>? events,
    bool? isLoading,
    String? error,
    String? typeFilter,
    bool? onlineFilter,
    bool? freeFilter,
  }) {
    return EventsState(
      events: events ?? this.events,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      typeFilter: typeFilter ?? this.typeFilter,
      onlineFilter: onlineFilter ?? this.onlineFilter,
      freeFilter: freeFilter ?? this.freeFilter,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────
class EventsNotifier extends StateNotifier<EventsState> {
  final EventsRepository _repo;

  EventsNotifier(this._repo) : super(const EventsState());

  Future<void> loadEvents() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final events = await _repo.getEvents(
        type: state.typeFilter,
        isOnline: state.onlineFilter,
        isFree: state.freeFilter,
      );
      state = state.copyWith(events: events, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Erro ao carregar eventos');
    }
  }

  void setFilters({String? type, bool? isOnline, bool? isFree}) {
    state = state.copyWith(
      typeFilter: type,
      onlineFilter: isOnline,
      freeFilter: isFree,
    );
    loadEvents();
  }

  void clearFilters() {
    state = const EventsState();
    loadEvents();
  }

  Future<bool> attend(String eventId) async {
    try {
      await _repo.attend(eventId);
      state = state.copyWith(
        events: state.events.map((e) {
          if (e.id == eventId) {
            return EventModel(
              id: e.id,
              title: e.title,
              description: e.description,
              eventType: e.eventType,
              status: e.status,
              startDate: e.startDate,
              endDate: e.endDate,
              location: e.location,
              eventUrl: e.eventUrl,
              maxAttendees: e.maxAttendees,
              attendeeCount: e.attendeeCount + 1,
              isOnline: e.isOnline,
              isFree: e.isFree,
              price: e.price,
              organizerName: e.organizerName,
              organizerLogoUrl: e.organizerLogoUrl,
              specialties: e.specialties,
              attending: true,
            );
          }
          return e;
        }).toList(),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> unattend(String eventId) async {
    try {
      await _repo.unattend(eventId);
      state = state.copyWith(
        events: state.events.map((e) {
          if (e.id == eventId) {
            return EventModel(
              id: e.id,
              title: e.title,
              description: e.description,
              eventType: e.eventType,
              status: e.status,
              startDate: e.startDate,
              endDate: e.endDate,
              location: e.location,
              eventUrl: e.eventUrl,
              maxAttendees: e.maxAttendees,
              attendeeCount: e.attendeeCount > 0 ? e.attendeeCount - 1 : 0,
              isOnline: e.isOnline,
              isFree: e.isFree,
              price: e.price,
              organizerName: e.organizerName,
              organizerLogoUrl: e.organizerLogoUrl,
              specialties: e.specialties,
              attending: false,
            );
          }
          return e;
        }).toList(),
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}

// ─── Provider ─────────────────────────────────────────────────
final eventsRepositoryProvider = Provider<EventsRepository>(
  (ref) => EventsRepository(ref.watch(apiClientProvider)),
);

final eventsProvider = StateNotifierProvider<EventsNotifier, EventsState>((ref) {
  return EventsNotifier(ref.watch(eventsRepositoryProvider));
});
