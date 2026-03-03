import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/api_provider.dart';

// ─── Patient Profile Model ─────────────────────────────────────────────────

class PatientProfile {
  final String id;
  final String fullName;
  final String? phone;
  final String? cpf;
  final DateTime? dateOfBirth;
  final String email;

  PatientProfile({
    required this.id,
    required this.fullName,
    this.phone,
    this.cpf,
    this.dateOfBirth,
    required this.email,
  });

  factory PatientProfile.fromJson(Map<String, dynamic> json) {
    return PatientProfile(
      id: json['id'] ?? '',
      fullName: json['fullName'] ?? '',
      phone: json['phone'],
      cpf: json['cpf'],
      dateOfBirth: json['dateOfBirth'] != null
          ? DateTime.tryParse(json['dateOfBirth'])
          : null,
      email: (json['user'] as Map<String, dynamic>?)?['email'] ?? '',
    );
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────

final patientProfileProvider =
    StateNotifierProvider<PatientProfileNotifier, AsyncValue<PatientProfile?>>(
  (ref) => PatientProfileNotifier(ref),
);

class PatientProfileNotifier extends StateNotifier<AsyncValue<PatientProfile?>> {
  final Ref _ref;
  PatientProfileNotifier(this._ref) : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    try {
      final api = _ref.read(apiClientProvider);
      final response = await api.dio.get('/patients/me');
      state = AsyncValue.data(PatientProfile.fromJson(response.data));
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> update({String? fullName, String? phone}) async {
    try {
      final api = _ref.read(apiClientProvider);
      final response = await api.dio.patch('/patients/me', data: {
        if (fullName != null) 'fullName': fullName,
        if (phone != null) 'phone': phone,
      });
      state = AsyncValue.data(PatientProfile.fromJson(response.data));
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────

class PatientProfileScreen extends ConsumerWidget {
  const PatientProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(patientProfileProvider);
    final authUser = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _buildError(context, ref, e.toString()),
        data: (profile) => profile == null
            ? const Center(child: Text('Perfil não encontrado'))
            : _buildProfile(context, ref, profile, authUser?.email ?? ''),
      ),
    );
  }

  Widget _buildError(BuildContext context, WidgetRef ref, String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text('Erro ao carregar perfil: $error',
                style: AppTextStyles.bodyMedium, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(patientProfileProvider.notifier).load(),
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfile(
    BuildContext context,
    WidgetRef ref,
    PatientProfile profile,
    String email,
  ) {
    final initials = profile.fullName.isNotEmpty
        ? profile.fullName.split(' ').map((w) => w[0]).take(2).join().toUpperCase()
        : 'P';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: const Color(0xFFE8F5E9),
                child: Text(initials,
                    style: const TextStyle(
                        color: Color(0xFF2E7D32),
                        fontSize: 24,
                        fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(profile.fullName,
                        style: AppTextStyles.headingMedium
                            .copyWith(fontSize: 20)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F5E9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Paciente',
                          style: TextStyle(
                              color: Color(0xFF2E7D32),
                              fontSize: 12,
                              fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.edit_outlined),
                onPressed: () => _showEditDialog(context, ref, profile),
                tooltip: 'Editar perfil',
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Info cards
          _infoSection(context, [
            _InfoItem(
              icon: Icons.email_outlined,
              label: 'E-mail',
              value: email,
            ),
            if (profile.phone != null)
              _InfoItem(
                icon: Icons.phone_outlined,
                label: 'Telefone',
                value: profile.phone!,
              ),
            if (profile.cpf != null)
              _InfoItem(
                icon: Icons.badge_outlined,
                label: 'CPF',
                value: _maskCpf(profile.cpf!),
              ),
            if (profile.dateOfBirth != null)
              _InfoItem(
                icon: Icons.cake_outlined,
                label: 'Data de nascimento',
                value: _formatDate(profile.dateOfBirth!),
              ),
          ]),

          const SizedBox(height: 24),

          // Logout button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.logout, size: 18),
              label: const Text('Sair da conta'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: BorderSide(color: AppColors.error.withValues(alpha: 0.5)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoSection(BuildContext context, List<_InfoItem> items) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final i = entry.key;
          final item = entry.value;
          return Column(
            children: [
              ListTile(
                leading:
                    Icon(item.icon, color: AppColors.primary, size: 22),
                title: Text(item.label,
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFF536471))),
                subtitle: Text(item.value,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w500)),
              ),
              if (i < items.length - 1)
                const Divider(height: 1, indent: 56),
            ],
          );
        }).toList(),
      ),
    );
  }

  void _showEditDialog(
      BuildContext context, WidgetRef ref, PatientProfile profile) {
    final nameCtrl = TextEditingController(text: profile.fullName);
    final phoneCtrl = TextEditingController(text: profile.phone ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Editar perfil'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Nome completo'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneCtrl,
              decoration: const InputDecoration(labelText: 'Telefone'),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(patientProfileProvider.notifier).update(
                    fullName: nameCtrl.text.trim(),
                    phone: phoneCtrl.text.trim().isEmpty
                        ? null
                        : phoneCtrl.text.trim(),
                  );
            },
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
  }

  String _maskCpf(String cpf) {
    if (cpf.length < 11) return cpf;
    return '${cpf.substring(0, 3)}.***.***-${cpf.substring(9)}';
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}

class _InfoItem {
  final IconData icon;
  final String label;
  final String value;
  const _InfoItem({required this.icon, required this.label, required this.value});
}
