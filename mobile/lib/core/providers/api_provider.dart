import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../repositories/auth_repository.dart';
import '../repositories/doctor_repository.dart';
import '../repositories/feed_repository.dart';
import '../repositories/connection_repository.dart';
import '../repositories/job_repository.dart';
import '../repositories/chat_repository.dart';
import '../repositories/notification_repository.dart';
import '../repositories/search_repository.dart';
import '../repositories/patient_repository.dart';
import '../repositories/appointment_repository.dart';

// ─── Core ─────────────────────────────────────────────────────
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

// ─── Repositories ─────────────────────────────────────────────
final authRepositoryProvider = Provider<AuthRepository>(
    (ref) => AuthRepository(ref.watch(apiClientProvider)));

final doctorRepositoryProvider = Provider<DoctorRepository>(
    (ref) => DoctorRepository(ref.watch(apiClientProvider)));

final feedRepositoryProvider = Provider<FeedRepository>(
    (ref) => FeedRepository(ref.watch(apiClientProvider)));

final connectionRepositoryProvider = Provider<ConnectionRepository>(
    (ref) => ConnectionRepository(ref.watch(apiClientProvider)));

final jobRepositoryProvider = Provider<JobRepository>(
    (ref) => JobRepository(ref.watch(apiClientProvider)));

final chatRepositoryProvider = Provider<ChatRepository>(
    (ref) => ChatRepository(ref.watch(apiClientProvider)));

final notificationRepositoryProvider = Provider<NotificationRepository>(
    (ref) => NotificationRepository(ref.watch(apiClientProvider)));

final searchRepositoryProvider = Provider<SearchRepository>(
    (ref) => SearchRepository(ref.watch(apiClientProvider)));

final patientRepositoryProvider = Provider<PatientRepository>(
    (ref) => PatientRepository(ref.watch(apiClientProvider)));

final appointmentRepoProvider = Provider<AppointmentRepository>(
    (ref) => AppointmentRepository(ref.watch(apiClientProvider)));
