import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/feed/presentation/feed_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/jobs/presentation/jobs_screen.dart';
import '../../features/chat/presentation/chat_list_screen.dart';
import '../../features/chat/presentation/chat_detail_screen.dart';
import '../../features/smart_search/presentation/smart_search_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/network/presentation/network_graph_screen.dart';
import '../../features/auth/presentation/register_patient_screen.dart';
import '../../features/appointment/presentation/doctor_search_screen.dart';
import '../../features/appointment/presentation/my_appointments_screen.dart';
import '../../features/appointment/presentation/patient_home_screen.dart';
import '../../shared/widgets/main_scaffold.dart';
import '../network/api_client.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/login',
    redirect: (context, state) async {
      final location = state.uri.toString();
      final isAuthRoute =
          location == '/login' || location == '/register' || location == '/register/patient';

      // Check if user has a stored token
      final token = await ApiClient.getAccessToken();
      final isLoggedIn = token != null;

      if (isLoggedIn && isAuthRoute) {
        return '/home';
      }
      if (!isLoggedIn && !isAuthRoute) {
        return '/login';
      }
      return null;
    },
    routes: [
      // Auth routes
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/register/patient',
        builder: (context, state) => const RegisterPatientScreen(),
      ),

      // Main app with bottom nav (doctors)
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          GoRoute(
            path: '/home',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/feed',
            builder: (context, state) => const FeedScreen(),
          ),
          GoRoute(
            path: '/search',
            builder: (context, state) {
              final query = state.uri.queryParameters['query'] ?? '';
              return SmartSearchScreen(initialQuery: query.isNotEmpty ? query : null);
            },
          ),
          GoRoute(
            path: '/jobs',
            builder: (context, state) => const JobsScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/network',
            builder: (context, state) => const NetworkGraphScreen(),
          ),
        ],
      ),

      // Standalone routes
      GoRoute(
        path: '/chat',
        builder: (context, state) => const ChatListScreen(),
      ),
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
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/smart-search',
        builder: (context, state) {
          final query = state.uri.queryParameters['query'] ?? '';
          return SmartSearchScreen(initialQuery: query);
        },
      ),

      // Patient routes
      GoRoute(
        path: '/patient/home',
        builder: (context, state) => const PatientHomeScreen(),
      ),
      GoRoute(
        path: '/patient/search',
        builder: (context, state) => const DoctorSearchScreen(),
      ),
      GoRoute(
        path: '/patient/appointments',
        builder: (context, state) => const MyAppointmentsScreen(),
      ),
    ],
  );
});
