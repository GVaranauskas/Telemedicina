import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/auth/presentation/register_patient_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/doctor_home/presentation/doctor_home_screen.dart';
import '../../features/institution_home/presentation/institution_home_screen.dart';
import '../../features/patient_home/presentation/patient_home_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/patient_home/presentation/patient_profile_screen.dart';
import '../../features/jobs/presentation/jobs_screen.dart';
import '../../features/chat/presentation/chat_list_screen.dart';
import '../../features/chat/presentation/chat_detail_screen.dart';
import '../../features/smart_search/presentation/smart_search_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/network/presentation/network_graph_screen.dart';
import '../../features/connections/presentation/connections_screen.dart';
import '../../features/appointment/presentation/my_appointments_screen.dart';
import '../../features/appointment/presentation/doctor_search_screen.dart';
import '../../features/profile/presentation/doctor_profile_screen.dart';
import '../../features/feed/presentation/post_detail_screen.dart';
import '../../features/feed/presentation/bookmarks_screen.dart';
import '../../features/profile/presentation/edit_profile_screen.dart';
import '../../features/institutions/presentation/institutions_screen.dart';
import '../../features/events/presentation/events_screen.dart';
import '../../features/groups/presentation/groups_screen.dart';
import '../../features/discover/presentation/discover_screen.dart';
import '../../shared/widgets/main_scaffold.dart';
import '../../shared/widgets/doctor_scaffold.dart';
import '../../shared/widgets/institution_scaffold.dart';
import '../../shared/widgets/patient_scaffold.dart';
import '../network/api_client.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();
final _doctorShellKey = GlobalKey<NavigatorState>();
final _institutionShellKey = GlobalKey<NavigatorState>();
final _patientShellKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  ApiClient.onSessionExpired = () {
    final context = _rootNavigatorKey.currentContext;
    if (context != null) {
      GoRouter.of(context).go('/login');
    }
  };

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/login',
    redirect: (context, state) async {
      final location = state.uri.toString();
      final isAuthRoute = location == '/login' ||
          location == '/register' ||
          location == '/register-patient';

      final token = await ApiClient.getAccessToken();
      final isLoggedIn = token != null;

      if (!isLoggedIn && !isAuthRoute) return '/login';

      if (isLoggedIn && isAuthRoute) {
        final role = await ApiClient.getUserRole();
        return _homeForRole(role);
      }

      return null;
    },
    routes: [
      // ─── Auth routes ───────────────────────────────────────────
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/register-patient', builder: (_, __) => const RegisterPatientScreen()),

      // ─── Legacy /home redirect by role ────────────────────────
      GoRoute(
        path: '/home',
        redirect: (context, state) async {
          final role = await ApiClient.getUserRole();
          return _homeForRole(role);
        },
      ),
      GoRoute(
        path: '/feed',
        redirect: (context, state) async {
          final role = await ApiClient.getUserRole();
          return _homeForRole(role);
        },
      ),

      // ─── Doctor Shell ──────────────────────────────────────────
      ShellRoute(
        navigatorKey: _doctorShellKey,
        builder: (context, state, child) => DoctorScaffold(child: child),
        routes: [
          GoRoute(path: '/doctor-home', builder: (_, __) => const DoctorHomeScreen()),
          GoRoute(path: '/connections', builder: (_, __) => const ConnectionsScreen()),
          GoRoute(path: '/network', builder: (_, __) => const NetworkGraphScreen()),
          GoRoute(
            path: '/search',
            builder: (context, state) {
              final query = state.uri.queryParameters['query'] ?? '';
              return SmartSearchScreen(initialQuery: query.isNotEmpty ? query : null);
            },
          ),
          GoRoute(path: '/jobs', builder: (_, __) => const JobsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          GoRoute(path: '/events', builder: (_, __) => const EventsScreen()),
          GoRoute(path: '/groups', builder: (_, __) => const GroupsScreen()),
          GoRoute(path: '/discover', builder: (_, __) => const DiscoverScreen()),
          GoRoute(
            path: '/doctor/:doctorId',
            builder: (context, state) => DoctorProfileScreen(doctorId: state.pathParameters['doctorId']!),
          ),
          GoRoute(path: '/institutions', builder: (_, __) => const InstitutionsScreen()),
        ],
      ),

      // ─── Institution Shell ─────────────────────────────────────
      ShellRoute(
        navigatorKey: _institutionShellKey,
        builder: (context, state, child) => InstitutionScaffold(child: child),
        routes: [
          GoRoute(path: '/institution-home', builder: (_, __) => const InstitutionHomeScreen()),
          GoRoute(
            path: '/institution/search',
            builder: (context, state) {
              final query = state.uri.queryParameters['query'] ?? '';
              return SmartSearchScreen(initialQuery: query.isNotEmpty ? query : null);
            },
          ),
          GoRoute(path: '/institution/jobs', builder: (_, __) => const JobsScreen()),
          GoRoute(
            path: '/doctor/:doctorId',
            builder: (context, state) => DoctorProfileScreen(doctorId: state.pathParameters['doctorId']!),
          ),
        ],
      ),

      // ─── Patient Shell ─────────────────────────────────────────
      ShellRoute(
        navigatorKey: _patientShellKey,
        builder: (context, state, child) => PatientScaffold(child: child),
        routes: [
          GoRoute(path: '/patient-home', builder: (_, __) => const PatientHomeScreen()),
          GoRoute(path: '/appointments', builder: (_, __) => const MyAppointmentsScreen()),
          GoRoute(path: '/doctor-search', builder: (_, __) => const DoctorSearchScreen()),
          GoRoute(
            path: '/doctor/:doctorId',
            builder: (context, state) => DoctorProfileScreen(doctorId: state.pathParameters['doctorId']!),
          ),
          GoRoute(path: '/patient/profile', builder: (_, __) => const PatientProfileScreen()),
        ],
      ),

      // ─── Shared standalone routes (all personas) ───────────────
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          GoRoute(path: '/legacy-home', builder: (_, __) => const HomeScreen()),
        ],
      ),
      GoRoute(path: '/chat', builder: (_, __) => const ChatListScreen()),
      GoRoute(
        path: '/chat/:chatId',
        builder: (context, state) {
          final chatId = state.pathParameters['chatId']!;
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ChatDetailScreen(
            chatId: chatId,
            otherUserName: extra['otherUserName'] ?? 'Médico',
            otherUserId: extra['otherUserId'] ?? '',
          );
        },
      ),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/bookmarks', builder: (_, __) => const BookmarksScreen()),
      GoRoute(path: '/profile/edit', builder: (_, __) => const EditProfileScreen()),
      GoRoute(
        path: '/post/:postId',
        builder: (context, state) => PostDetailScreen(postId: state.pathParameters['postId']!),
      ),
    ],
  );
});

String _homeForRole(String? role) {
  switch (role) {
    case 'INSTITUTION_ADMIN':
      return '/institution-home';
    case 'PATIENT':
      return '/patient-home';
    case 'DOCTOR':
    default:
      return '/doctor-home';
  }
}
