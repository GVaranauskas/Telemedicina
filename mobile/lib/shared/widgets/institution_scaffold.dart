import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/auth_provider.dart';

class InstitutionScaffold extends ConsumerWidget {
  final Widget child;

  const InstitutionScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.toString();
    final width = MediaQuery.of(context).size.width;

    if (width >= 700) {
      return _InstitutionWideLayout(child: child, location: location);
    }
    return _InstitutionMobileLayout(child: child, location: location);
  }
}

// ─── Wide layout ──────────────────────────────────────────────────────────────

class _InstitutionWideLayout extends ConsumerWidget {
  final Widget child;
  final String location;

  const _InstitutionWideLayout({required this.child, required this.location});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final showLabels = width >= 1000;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _InstitutionSidebar(location: location, showLabels: showLabels),
          const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFEFF3F4)),
          Expanded(child: child),
        ],
      ),
    );
  }
}

// ─── Mobile layout ────────────────────────────────────────────────────────────

class _InstitutionMobileLayout extends ConsumerWidget {
  final Widget child;
  final String location;

  const _InstitutionMobileLayout({required this.child, required this.location});

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
                _navItem(context, Icons.dashboard_outlined, Icons.dashboard, '/institution-home', location),
                _navItem(context, Icons.calendar_month_outlined, Icons.calendar_month, '/institution-home', location),
                _navItem(context, Icons.search, Icons.search, '/institution/search', location),
                _navItem(context, Icons.notifications_outlined, Icons.notifications, '/notifications', location),
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

// ─── Sidebar ─────────────────────────────────────────────────────────────────

class _InstitutionSidebar extends ConsumerWidget {
  final String location;
  final bool showLabels;

  const _InstitutionSidebar({required this.location, required this.showLabels});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;

    return SizedBox(
      width: showLabels ? 260 : 72,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: showLabels ? 20 : 16, vertical: 16),
              child: showLabels
                  ? Row(children: [
                      Icon(Icons.local_hospital_rounded, color: AppColors.primary, size: 28),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text('MedConnect',
                            style: TextStyle(color: AppColors.primary, fontSize: 20, fontWeight: FontWeight.w800)),
                      ),
                    ])
                  : Icon(Icons.local_hospital_rounded, color: AppColors.primary, size: 28),
            ),
            if (showLabels)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('Instituição',
                      style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w600)),
                ),
              ),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _item(context, Icons.dashboard_outlined, Icons.dashboard, 'Painel', '/institution-home'),
                    _item(context, Icons.calendar_month_outlined, Icons.calendar_month, 'Escalas', '/institution-home'),
                    _item(context, Icons.person_search_outlined, Icons.person_search, 'Profissionais', '/institution-home'),
                    _item(context, Icons.work_outline, Icons.work, 'Vagas', '/institution/jobs'),
                    _item(context, Icons.description_outlined, Icons.description, 'Contratos', '/institution-home'),
                    _item(context, Icons.contact_phone_outlined, Icons.contact_phone, 'Contatos', '/institution-home'),
                    _item(context, Icons.search, Icons.search, 'Buscar', '/institution/search'),
                    _item(context, Icons.notifications_outlined, Icons.notifications, 'Notificações', '/notifications'),
                    _item(context, Icons.chat_bubble_outline, Icons.chat_bubble, 'Mensagens', '/chat'),
                  ],
                ),
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: showLabels ? 16 : 12, vertical: 10),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: const Color(0xFFE8F0FE),
                    child: Icon(Icons.business, color: AppColors.primary, size: 18),
                  ),
                  if (showLabels) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(user?.email ?? 'Instituição',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF536471)),
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
                  ] else ...[
                    const SizedBox(height: 4),
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
    final isActive = location.startsWith(path);
    return GestureDetector(
      onTap: () => context.go(path),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: showLabels ? 16 : 0, vertical: 12),
        child: showLabels
            ? Row(children: [
                Icon(isActive ? activeIcon : icon, size: 22,
                    color: isActive ? AppColors.primary : const Color(0xFF536471)),
                const SizedBox(width: 16),
                Text(label,
                    style: TextStyle(fontSize: 16, fontWeight: isActive ? FontWeight.w700 : FontWeight.w400,
                        color: isActive ? AppColors.primary : const Color(0xFF536471))),
              ])
            : Center(
                child: Icon(isActive ? activeIcon : icon, size: 26,
                    color: isActive ? AppColors.primary : const Color(0xFF536471)),
              ),
      ),
    );
  }
}
