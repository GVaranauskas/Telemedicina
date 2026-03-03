import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/auth_provider.dart';

class DoctorScaffold extends ConsumerWidget {
  final Widget child;

  const DoctorScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.toString();
    final width = MediaQuery.of(context).size.width;

    if (width >= 700) {
      return _DoctorWideLayout(child: child, location: location);
    }
    return _DoctorMobileLayout(child: child, location: location);
  }
}

// ─── Wide layout (sidebar) ────────────────────────────────────────────────────

class _DoctorWideLayout extends ConsumerWidget {
  final Widget child;
  final String location;

  const _DoctorWideLayout({required this.child, required this.location});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final showLabels = width >= 1000;
    final showRightPanel = width >= 1200;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _DoctorSidebar(location: location, showLabels: showLabels),
          const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFEFF3F4)),
          Expanded(
            flex: showRightPanel ? 2 : 3,
            child: child,
          ),
          if (showRightPanel) ...[
            const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFEFF3F4)),
            SizedBox(width: 300, child: _DoctorRightPanel()),
          ],
        ],
      ),
    );
  }
}

// ─── Mobile layout (bottom nav) ───────────────────────────────────────────────

class _DoctorMobileLayout extends ConsumerWidget {
  final Widget child;
  final String location;

  const _DoctorMobileLayout({required this.child, required this.location});

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
                _navItem(context, Icons.dashboard_outlined, Icons.dashboard, '/doctor-home', location),
                _navItem(context, Icons.search, Icons.search, '/search', location),
                _navItem(context, Icons.people_outline, Icons.people, '/connections', location),
                _navItem(context, Icons.notifications_outlined, Icons.notifications, '/notifications', location),
                _navItem(context, Icons.person_outline, Icons.person, '/profile', location),
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
        child: Icon(
          isActive ? activeIcon : icon,
          size: 26,
          color: isActive ? AppColors.primary : const Color(0xFF536471),
        ),
      ),
    );
  }
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

class _DoctorSidebar extends ConsumerWidget {
  final String location;
  final bool showLabels;

  const _DoctorSidebar({required this.location, required this.showLabels});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final initials = _initials(user?.fullName ?? '');

    return SizedBox(
      width: showLabels ? 240 : 72,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Logo
            Padding(
              padding: EdgeInsets.symmetric(horizontal: showLabels ? 20 : 16, vertical: 16),
              child: showLabels
                  ? Row(children: [
                      Icon(Icons.medical_services_rounded, color: AppColors.primary, size: 28),
                      const SizedBox(width: 10),
                      Text('MedConnect',
                          style: TextStyle(color: AppColors.primary, fontSize: 20, fontWeight: FontWeight.w800)),
                    ])
                  : Icon(Icons.medical_services_rounded, color: AppColors.primary, size: 28),
            ),
            const SizedBox(height: 4),
            // Nav items
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _item(context, Icons.dashboard_outlined, Icons.dashboard, 'Painel', '/doctor-home'),
                    _item(context, Icons.people_outline, Icons.people, 'Conexões', '/connections'),
                    _item(context, Icons.search, Icons.search, 'Buscar', '/search'),
                    _item(context, Icons.work_outline, Icons.work, 'Vagas', '/jobs'),
                    _item(context, Icons.event_outlined, Icons.event, 'Eventos', '/events'),
                    _item(context, Icons.groups_outlined, Icons.groups, 'Grupos', '/groups'),
                    _item(context, Icons.explore_outlined, Icons.explore, 'Descobrir', '/discover'),
                    _item(context, Icons.business_outlined, Icons.business, 'Instituições', '/institutions'),
                    _item(context, Icons.notifications_outlined, Icons.notifications, 'Notificações', '/notifications'),
                    _item(context, Icons.chat_bubble_outline, Icons.chat_bubble, 'Mensagens', '/chat'),
                    _item(context, Icons.person_outline, Icons.person, 'Perfil', '/profile'),
                  ],
                ),
              ),
            ),
            // User info + logout
            const Divider(height: 1),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: showLabels ? 16 : 12, vertical: 10),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: AppColors.primaryLight,
                    child: Text(initials,
                        style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                  if (showLabels) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(user?.fullName ?? 'Médico',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                          Text(user?.email ?? '',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF536471)),
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.logout, size: 18, color: Color(0xFF536471)),
                      tooltip: 'Sair',
                      onPressed: () async {
                        await ref.read(authProvider.notifier).logout();
                        if (context.mounted) context.go('/login');
                      },
                    ),
                  ] else ...[
                    const SizedBox(width: 4),
                    GestureDetector(
                      onTap: () async {
                        await ref.read(authProvider.notifier).logout();
                        if (context.mounted) context.go('/login');
                      },
                      child: const Icon(Icons.logout, size: 20, color: Color(0xFF536471)),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _item(BuildContext context, IconData icon, IconData activeIcon, String label, String path) {
    final isActive = location.startsWith(path) || (path == '/doctor-home' && location == '/doctor-home');
    return GestureDetector(
      onTap: () => context.go(path),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: showLabels ? 16 : 0, vertical: 12),
        child: showLabels
            ? Row(children: [
                Icon(isActive ? activeIcon : icon, size: 24,
                    color: isActive ? AppColors.primary : const Color(0xFF536471)),
                const SizedBox(width: 16),
                Text(label,
                    style: TextStyle(fontSize: 17, fontWeight: isActive ? FontWeight.w700 : FontWeight.w400,
                        color: isActive ? AppColors.primary : const Color(0xFF536471))),
              ])
            : Center(
                child: Icon(isActive ? activeIcon : icon, size: 26,
                    color: isActive ? AppColors.primary : const Color(0xFF536471)),
              ),
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts.last[0]}'.toUpperCase();
  }
}

// ─── Right panel ─────────────────────────────────────────────────────────────

class _DoctorRightPanel extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quick search
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F9FA),
                borderRadius: BorderRadius.circular(24),
              ),
              child: GestureDetector(
                onTap: () => context.go('/search'),
                child: Row(children: [
                  const Icon(Icons.search, color: Color(0xFF536471), size: 20),
                  const SizedBox(width: 8),
                  Text('Buscar no MedConnect',
                      style: const TextStyle(color: Color(0xFF536471), fontSize: 14)),
                ]),
              ),
            ),
            const SizedBox(height: 20),
            // Quick links
            Text('Atalhos', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            _quickLink(context, Icons.calendar_today_outlined, 'Minha Agenda', '/doctor-home'),
            _quickLink(context, Icons.work_outline, 'Vagas Recomendadas', '/jobs'),
            _quickLink(context, Icons.hub_outlined, 'Meu Grafo', '/network'),
          ],
        ),
      ),
    );
  }

  Widget _quickLink(BuildContext context, IconData icon, String label, String path) {
    return GestureDetector(
      onTap: () => context.go(path),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 10),
          Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
        ]),
      ),
    );
  }
}
