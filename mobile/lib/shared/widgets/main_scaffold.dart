import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';

class MainScaffold extends StatelessWidget {
  final Widget child;

  const MainScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    
    return Scaffold(
      backgroundColor: AppColors.background,
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border(
            top: BorderSide(color: AppColors.border, width: 1),
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(
                  context: context,
                  location: location,
                  icon: Icons.home_outlined,
                  activeIcon: Icons.home,
                  label: 'Feed',
                  path: '/home',
                ),
                _buildNavItem(
                  context: context,
                  location: location,
                  icon: Icons.people_outline,
                  activeIcon: Icons.people,
                  label: 'Rede',
                  path: '/network',
                ),
                _buildNavItem(
                  context: context,
                  location: location,
                  icon: Icons.search_outlined,
                  activeIcon: Icons.search,
                  label: 'Buscar',
                  path: '/search',
                ),
                _buildNavItem(
                  context: context,
                  location: location,
                  icon: Icons.work_outline,
                  activeIcon: Icons.work,
                  label: 'Vagas',
                  path: '/jobs',
                ),
                _buildNavItem(
                  context: context,
                  location: location,
                  icon: Icons.person_outline,
                  activeIcon: Icons.person,
                  label: 'Perfil',
                  path: '/profile',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required BuildContext context,
    required String location,
    required IconData icon,
    required IconData activeIcon,
    required String label,
    required String path,
  }) {
    final isActive = _isRouteActive(location, path);

    return GestureDetector(
      onTap: () => context.go(path),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isActive ? activeIcon : icon,
              size: 24,
              color: isActive ? AppColors.primary : AppColors.textTertiary,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive ? AppColors.primary : AppColors.textTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _isRouteActive(String location, String path) {
    // Handle special cases
    if (path == '/home') {
      return location == '/home' || location == '/feed' || location.startsWith('/home');
    }
    return location.startsWith(path);
  }
}
