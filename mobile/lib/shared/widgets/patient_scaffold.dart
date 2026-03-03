import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/auth_provider.dart';

class PatientScaffold extends ConsumerWidget {
  final Widget child;

  const PatientScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.toString();
    final width = MediaQuery.of(context).size.width;

    if (width >= 700) {
      return _PatientWideLayout(child: child, location: location);
    }
    return _PatientMobileLayout(child: child, location: location);
  }
}

class _PatientWideLayout extends ConsumerWidget {
  final Widget child;
  final String location;

  const _PatientWideLayout({required this.child, required this.location});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _PatientSidebar(location: location),
          const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFEFF3F4)),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _PatientMobileLayout extends ConsumerWidget {
  final Widget child;
  final String location;

  const _PatientMobileLayout({required this.child, required this.location});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xFFEFF3F4))),
          color: Colors.white,
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navItem(context, Icons.home_outlined, Icons.home, '/patient-home', location),
                _navItem(context, Icons.search, Icons.search, '/doctor-search', location),
                _navItem(context, Icons.calendar_today_outlined, Icons.calendar_today, '/appointments', location),
                _navItem(context, Icons.person_outline, Icons.person, '/patient/profile', location),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navItem(BuildContext context, IconData icon, IconData activeIcon, String path, String location) {
    final isActive = location.startsWith(path);
    return GestureDetector(
      onTap: () => context.go(path),
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Icon(isActive ? activeIcon : icon, size: 26,
            color: isActive ? AppColors.primary : const Color(0xFF536471)),
      ),
    );
  }
}

class _PatientSidebar extends ConsumerWidget {
  final String location;

  const _PatientSidebar({required this.location});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final name = user?.fullName ?? 'Paciente';
    final initials = name.isNotEmpty ? name[0].toUpperCase() : 'P';

    return SizedBox(
      width: 240,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(children: [
                Icon(Icons.medical_services_rounded, color: AppColors.primary, size: 28),
                const SizedBox(width: 10),
                Text('MedConnect',
                    style: TextStyle(color: AppColors.primary, fontSize: 20, fontWeight: FontWeight.w800)),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('Paciente',
                    style: TextStyle(color: Color(0xFF2E7D32), fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _item(context, Icons.home_outlined, Icons.home, 'Início', '/patient-home'),
                  _item(context, Icons.calendar_today_outlined, Icons.calendar_today, 'Minhas Consultas', '/appointments'),
                  _item(context, Icons.search, Icons.search, 'Buscar Médico', '/doctor-search'),
                  _item(context, Icons.notifications_outlined, Icons.notifications, 'Notificações', '/notifications'),
                  _item(context, Icons.person_outline, Icons.person, 'Perfil', '/patient/profile'),
                ],
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFFE8F5E9),
                  child: Text(initials,
                      style: const TextStyle(color: Color(0xFF2E7D32), fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
                IconButton(
                  icon: const Icon(Icons.logout, size: 18, color: Color(0xFF536471)),
                  tooltip: 'Sair',
                  onPressed: () async {
                    await ref.read(authProvider.notifier).logout();
                    if (context.mounted) context.go('/login');
                  },
                ),
              ]),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _item(BuildContext context, IconData icon, IconData activeIcon, String label, String path) {
    final isActive = location.startsWith(path);
    return GestureDetector(
      onTap: () => context.go(path),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(children: [
          Icon(isActive ? activeIcon : icon, size: 22,
              color: isActive ? AppColors.primary : const Color(0xFF536471)),
          const SizedBox(width: 16),
          Text(label,
              style: TextStyle(fontSize: 16, fontWeight: isActive ? FontWeight.w700 : FontWeight.w400,
                  color: isActive ? AppColors.primary : const Color(0xFF536471))),
        ]),
      ),
    );
  }
}
