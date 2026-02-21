import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/medconnect_theme.dart';
import 'core/routing/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: MedConnectApp()));
}

class MedConnectApp extends ConsumerWidget {
  const MedConnectApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'MedConnect',
      theme: MedConnectTheme.light,
      debugShowCheckedModeBanner: false,
      routerConfig: router,
    );
  }
}
