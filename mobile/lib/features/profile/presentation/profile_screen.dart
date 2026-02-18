import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/doctor_provider.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/models/doctor_model.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(profileProvider.notifier).loadMyProfile());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(profileProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? _buildErrorState(state.error!)
              : state.doctor != null
                  ? _buildProfile(state.doctor!)
                  : const Center(child: Text('Perfil não encontrado')),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: AppColors.error),
          const SizedBox(height: 16),
          Text(error, style: AppTextStyles.bodyMedium),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.read(profileProvider.notifier).loadMyProfile(),
            child: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }

  Widget _buildProfile(DoctorModel doctor) {
    return CustomScrollView(
      slivers: [
        // Header minimalista
        SliverToBoxAdapter(
          child: _buildProfileHeader(doctor),
        ),
        // Conteúdo
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              if (doctor.bio != null && doctor.bio!.isNotEmpty)
                _buildSection('Sobre', doctor.bio!),
              if (doctor.specialties.isNotEmpty)
                _buildChipSection('Especialidades', 
                  doctor.specialties.map((s) => s.name ?? '').where((n) => n.isNotEmpty).toList()),
              if (doctor.skills.isNotEmpty)
                _buildChipSection('Habilidades',
                  doctor.skills.map((s) => s.name ?? '').where((n) => n.isNotEmpty).toList()),
              const SizedBox(height: 24),
              _buildLogoutButton(),
              const SizedBox(height: 32),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _buildProfileHeader(DoctorModel doctor) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 60, 24, 32),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: Column(
        children: [
          // Avatar
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Center(
              child: Text(
                doctor.fullName.isNotEmpty ? doctor.fullName[0].toUpperCase() : 'D',
                style: AppTextStyles.displaySmall.copyWith(color: AppColors.primary),
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Nome
          Text(
            doctor.fullName,
            style: AppTextStyles.headingMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          // CRM
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              doctor.crmFormatted,
              style: AppTextStyles.labelMedium.copyWith(color: AppColors.primary),
            ),
          ),
          if (doctor.city != null || doctor.state != null) ...[
            const SizedBox(height: 8),
            Text(
              [doctor.city, doctor.state].where((e) => e != null).join(', '),
              style: AppTextStyles.bodySmall,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTextStyles.titleMedium),
          const SizedBox(height: 8),
          Text(content, style: AppTextStyles.bodyMedium),
        ],
      ),
    );
  }

  Widget _buildChipSection(String title, List<String> items) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTextStyles.titleMedium),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: items.map((item) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                item,
                style: AppTextStyles.labelMedium.copyWith(color: AppColors.primary),
              ),
            )).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildLogoutButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () async {
          await ref.read(authProvider.notifier).logout();
          if (mounted) context.go('/login');
        },
        icon: const Icon(Icons.logout, size: 18),
        label: const Text('Sair da conta'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.error,
          side: const BorderSide(color: AppColors.error),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}