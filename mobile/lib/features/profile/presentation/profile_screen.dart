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
      appBar: AppBar(
        title: const Text('Meu Perfil'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: state.doctor != null
                ? () => _showEditProfileSheet(context, state.doctor!)
                : null,
          ),
          PopupMenuButton(
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'logout', child: Text('Sair')),
            ],
            onSelected: (value) async {
              if (value == 'logout') {
                await ref.read(authProvider.notifier).logout();
                if (mounted) context.go('/login');
              }
            },
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(state.error!, style: TextStyle(color: AppColors.error)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref.read(profileProvider.notifier).loadMyProfile(),
                        child: const Text('Tentar novamente'),
                      ),
                    ],
                  ),
                )
              : state.doctor != null
                  ? _buildProfile(context, state.doctor!)
                  : const Center(child: Text('Perfil não encontrado')),
    );
  }

  Widget _buildProfile(BuildContext context, DoctorModel doctor) {
    return RefreshIndicator(
      onRefresh: () => ref.read(profileProvider.notifier).loadMyProfile(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          children: [
            // Profile header
            Container(
              padding: const EdgeInsets.all(24),
              color: AppColors.surface,
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: AppColors.primaryLight,
                    backgroundImage: doctor.profilePicUrl != null
                        ? NetworkImage(doctor.profilePicUrl!)
                        : null,
                    child: doctor.profilePicUrl == null
                        ? Text(
                            doctor.fullName.isNotEmpty
                                ? doctor.fullName[0].toUpperCase()
                                : 'D',
                            style: const TextStyle(
                                fontSize: 36,
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold),
                          )
                        : null,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    doctor.fullName,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    doctor.crmFormatted,
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                  if (doctor.city != null || doctor.state != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      [doctor.city, doctor.state]
                          .where((e) => e != null)
                          .join(', '),
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Bio
            if (doctor.bio != null && doctor.bio!.isNotEmpty)
              _buildSection(context, 'Sobre', doctor.bio!),

            // Specialties
            if (doctor.specialties.isNotEmpty)
              _buildChipSection(
                context,
                'Especialidades',
                doctor.specialties.map((s) => s.name ?? 'Especialidade').toList(),
                AppColors.primary,
              ),

            // Skills
            if (doctor.skills.isNotEmpty)
              _buildChipSection(
                context,
                'Habilidades',
                doctor.skills.map((s) => s.name ?? 'Habilidade').toList(),
                AppColors.secondary,
              ),

            // Experience
            if (doctor.experiences.isNotEmpty)
              _buildExperienceSection(context, doctor.experiences),

            // Education
            if (doctor.universityName != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 8),
                color: AppColors.surface,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Formação',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Text(
                      '${doctor.universityName}${doctor.graduationYear != null ? ' (${doctor.graduationYear})' : ''}',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, String content) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 8),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(content, style: TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildChipSection(
    BuildContext context,
    String title,
    List<String> items,
    Color color,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 8),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: items
                .map((item) => Chip(
                      label: Text(item,
                          style: TextStyle(color: color, fontSize: 13)),
                      backgroundColor: color.withOpacity(0.1),
                      side: BorderSide.none,
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildExperienceSection(
      BuildContext context, List<DoctorExperience> experiences) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 8),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Experiência',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          ...experiences.map((exp) => _buildExperienceItem(exp)),
        ],
      ),
    );
  }

  Widget _buildExperienceItem(DoctorExperience exp) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primaryLight.withOpacity(0.3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.business,
                color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(exp.role,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                if (exp.description != null)
                  Text(exp.description!,
                      style: TextStyle(color: AppColors.textSecondary)),
                Text(
                  exp.isCurrent
                      ? '${exp.startDate} - Atual'
                      : '${exp.startDate}${exp.endDate != null ? ' - ${exp.endDate}' : ''}',
                  style: TextStyle(
                      fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showEditProfileSheet(BuildContext context, DoctorModel doctor) {
    final bioController = TextEditingController(text: doctor.bio ?? '');
    final cityController = TextEditingController(text: doctor.city ?? '');
    final stateController = TextEditingController(text: doctor.state ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Editar Perfil',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 16),
            TextField(
              controller: bioController,
              maxLines: 3,
              decoration: const InputDecoration(
                  labelText: 'Bio', hintText: 'Conte sobre você...'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: cityController,
                    decoration: const InputDecoration(labelText: 'Cidade'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: stateController,
                    decoration: const InputDecoration(labelText: 'UF'),
                    maxLength: 2,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                ref.read(profileProvider.notifier).updateProfile({
                  'bio': bioController.text,
                  'city': cityController.text,
                  'state': stateController.text,
                });
                Navigator.pop(context);
              },
              child: const Text('Salvar'),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
