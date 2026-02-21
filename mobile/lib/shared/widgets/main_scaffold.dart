import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/auth_provider.dart';

class MainScaffold extends ConsumerWidget {
  final Widget child;

  const MainScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.toString();
    final width = MediaQuery.of(context).size.width;

    if (width >= 700) {
      return _WideLayout(child: child, location: location);
    }
    return _MobileLayout(child: child, location: location);
  }
}

// ─── Wide layout (sidebar) ────────────────────────────────────────────────────

class _WideLayout extends ConsumerWidget {
  final Widget child;
  final String location;

  const _WideLayout({required this.child, required this.location});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final showLabels = width >= 1000;
    final showRightPanel = width >= 1100;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Sidebar(location: location, showLabels: showLabels),
          const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFEFF3F4)),
          Expanded(
            flex: showRightPanel ? 2 : 3,
            child: child,
          ),
          if (showRightPanel) ...[
            const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFEFF3F4)),
            SizedBox(width: 320, child: _RightPanel()),
          ],
        ],
      ),
    );
  }
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

class _Sidebar extends ConsumerWidget {
  final String location;
  final bool showLabels;

  const _Sidebar({required this.location, required this.showLabels});

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
              padding: EdgeInsets.symmetric(
                horizontal: showLabels ? 20 : 16,
                vertical: 16,
              ),
              child: showLabels
                  ? Row(children: [
                      Icon(Icons.medical_services_rounded,
                          color: AppColors.primary, size: 28),
                      const SizedBox(width: 10),
                      Text('MedConnect',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          )),
                    ])
                  : Icon(Icons.medical_services_rounded,
                      color: AppColors.primary, size: 28),
            ),
            const SizedBox(height: 8),
            // Nav items
            _item(context, Icons.home_outlined, Icons.home, 'Feed', '/home'),
            _item(context, Icons.notifications_outlined, Icons.notifications,
                'Notificações', '/notifications'),
            _item(context, Icons.chat_bubble_outline, Icons.chat_bubble,
                'Mensagens', '/chat'),
            _item(context, Icons.people_outline, Icons.people, 'Conexões',
                '/connections'),
            _item(context, Icons.search, Icons.search, 'Buscar', '/search'),
            _item(context, Icons.work_outline, Icons.work, 'Vagas', '/jobs'),
            _item(context, Icons.person_outline, Icons.person, 'Perfil',
                '/profile'),
            const Spacer(),
            // Publish button
            if (showLabels)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24)),
                      elevation: 0,
                    ),
                    child: const Text('Publicar',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
              )
            else
              Center(
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.add, color: Colors.white, size: 24),
                ),
              ),
            const SizedBox(height: 16),
            // User profile row
            Padding(
              padding: EdgeInsets.symmetric(
                  horizontal: showLabels ? 16 : 12, vertical: 12),
              child: GestureDetector(
                onTap: () {},
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: AppColors.primaryLight,
                      child: Text(initials,
                          style: TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                              fontSize: 13)),
                    ),
                    if (showLabels) ...[
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              user?.fullName ?? 'Médico',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: Color(0xFF0F1419),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              user?.email ?? '',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF536471),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _item(BuildContext context, IconData icon, IconData activeIcon,
      String label, String path) {
    final isActive = _isRouteActive(location, path);
    return GestureDetector(
      onTap: () => context.go(path),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: showLabels ? 16 : 0,
          vertical: 12,
        ),
        child: showLabels
            ? Row(children: [
                Icon(isActive ? activeIcon : icon,
                    size: 24,
                    color: isActive
                        ? const Color(0xFF0F1419)
                        : const Color(0xFF536471)),
                const SizedBox(width: 16),
                Text(label,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight:
                          isActive ? FontWeight.w700 : FontWeight.w400,
                      color: isActive
                          ? const Color(0xFF0F1419)
                          : const Color(0xFF536471),
                    )),
              ])
            : Center(
                child: Icon(isActive ? activeIcon : icon,
                    size: 26,
                    color: isActive
                        ? const Color(0xFF0F1419)
                        : const Color(0xFF536471)),
              ),
      ),
    );
  }

  bool _isRouteActive(String location, String path) {
    if (path == '/home') return location == '/home' || location == '/feed';
    if (path == '/connections') {
      return location.startsWith('/connections') ||
          location.startsWith('/network');
    }
    return location.startsWith(path);
  }

  String _initials(String name) {
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts.last[0]}'.toUpperCase();
  }
}

// ─── Right panel ─────────────────────────────────────────────────────────────

class _RightPanel extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search bar
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF3F4),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Row(
                children: [
                  const Icon(Icons.search,
                      color: Color(0xFF536471), size: 20),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: () => context.go('/search'),
                    child: const Text('Buscar no MedConnect',
                        style: TextStyle(
                            color: Color(0xFF536471), fontSize: 15)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Trending card
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF7F9F9),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Text('Em destaque',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F1419),
                        )),
                  ),
                  ..._trendingTopics.map((t) => _buildTrendingItem(
                      context, t['category']!, t['topic']!, t['count']!)),
                  const SizedBox(height: 8),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Sugestões
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF7F9F9),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Text('Conecte-se',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F1419),
                        )),
                  ),
                  _buildSuggestion(context, 'Cardiologistas SP',
                      'Especialistas em cardiologia', Icons.favorite_rounded),
                  _buildSuggestion(context, 'Residência Médica',
                      'Residentes e preceptores', Icons.school_rounded),
                  _buildSuggestion(context, 'Telemedicina BR',
                      'Médicos em telemedicina', Icons.video_call_rounded),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrendingItem(BuildContext context, String category,
      String topic, String count) {
    return InkWell(
      onTap: () => context.go('/search?query=$topic'),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(category,
                style: const TextStyle(
                    fontSize: 13, color: Color(0xFF536471))),
            const SizedBox(height: 2),
            Text(topic,
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F1419))),
            const SizedBox(height: 2),
            Text('$count posts',
                style: const TextStyle(
                    fontSize: 13, color: Color(0xFF536471))),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggestion(
      BuildContext context, String title, String subtitle, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: Color(0xFF0F1419))),
                Text(subtitle,
                    style: const TextStyle(
                        fontSize: 13, color: Color(0xFF536471))),
              ],
            ),
          ),
          OutlinedButton(
            onPressed: () => context.go('/connections'),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF0F1419),
              side: const BorderSide(color: Color(0xFF0F1419), width: 1.5),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text('Seguir',
                style:
                    TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  static const _trendingTopics = [
    {'category': 'Medicina · Em alta', 'topic': '#Cardiologia', 'count': '2.4k'},
    {'category': 'Saúde · Tendência', 'topic': '#Telemedicina', 'count': '1.8k'},
    {'category': 'Pesquisa · Em destaque', 'topic': '#InteligênciaArtificial', 'count': '3.1k'},
    {'category': 'Residência · Trending', 'topic': '#ResidênciaMédica', 'count': '980'},
    {'category': 'Eventos · Hoje', 'topic': '#CongressoSBC2026', 'count': '542'},
  ];
}

// ─── Mobile layout (bottom nav) ──────────────────────────────────────────────

class _MobileLayout extends StatelessWidget {
  final Widget child;
  final String location;

  const _MobileLayout({required this.child, required this.location});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: Color(0xFFEFF3F4), width: 1),
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navItem(context, Icons.home_outlined, Icons.home, '/home'),
                _navItem(context, Icons.search, Icons.search, '/search'),
                _navItem(context, Icons.notifications_outlined,
                    Icons.notifications, '/notifications'),
                _navItem(context, Icons.chat_bubble_outline,
                    Icons.chat_bubble, '/chat'),
                _navItem(context, Icons.person_outline, Icons.person,
                    '/profile'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navItem(BuildContext context, IconData icon, IconData activeIcon,
      String path) {
    final isActive = location.startsWith(path) ||
        (path == '/home' && (location == '/feed' || location == '/home'));

    return GestureDetector(
      onTap: () => context.go(path),
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Icon(
          isActive ? activeIcon : icon,
          size: 26,
          color: isActive ? const Color(0xFF0F1419) : const Color(0xFF536471),
        ),
      ),
    );
  }
}
