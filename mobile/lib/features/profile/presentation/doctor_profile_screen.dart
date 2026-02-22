import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/doctor_provider.dart';
import '../../../core/providers/connection_provider.dart';
import '../../../core/providers/api_provider.dart';
import '../../../core/models/doctor_model.dart';

class DoctorProfileScreen extends ConsumerStatefulWidget {
  final String doctorId;

  const DoctorProfileScreen({super.key, required this.doctorId});

  @override
  ConsumerState<DoctorProfileScreen> createState() =>
      _DoctorProfileScreenState();
}

class _DoctorProfileScreenState extends ConsumerState<DoctorProfileScreen> {
  DoctorModel? _doctor;
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _endorsements = [];

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _loadEndorsements();
  }

  Future<void> _loadEndorsements() async {
    try {
      final connRepo = ref.read(connectionRepositoryProvider);
      final endorsements = await connRepo.getEndorsements(widget.doctorId);
      if (mounted) setState(() => _endorsements = endorsements);
    } catch (_) {}
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final repo = ref.read(doctorRepositoryProvider);
      final doctor = await repo.getProfile(widget.doctorId);
      if (mounted) {
        setState(() {
          _doctor = doctor;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Erro ao carregar perfil: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(_doctor?.fullName ?? 'Perfil'),
        backgroundColor: AppColors.surface,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorState(_error!)
              : _doctor != null
                  ? _buildProfile(_doctor!)
                  : const Center(child: Text('Perfil nao encontrado')),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: AppColors.error),
          const SizedBox(height: 16),
          Text(error, style: AppTextStyles.bodyMedium, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadProfile,
            child: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }

  Widget _buildProfile(DoctorModel doctor) {
    return RefreshIndicator(
      onRefresh: _loadProfile,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildProfileHeader(doctor)),
          SliverToBoxAdapter(child: _buildActionButtons(doctor)),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                if (doctor.bio != null && doctor.bio!.isNotEmpty)
                  _buildSection('Sobre', doctor.bio!),
                if (doctor.specialties.isNotEmpty)
                  _buildChipSection(
                    'Especialidades',
                    doctor.specialties
                        .map((s) => s.name ?? '')
                        .where((n) => n.isNotEmpty)
                        .toList(),
                  ),
                if (doctor.skills.isNotEmpty)
                  _buildSkillsWithEndorsements(doctor),
                if (doctor.experiences.isNotEmpty)
                  _buildExperienceSection(doctor.experiences),
                const SizedBox(height: 32),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileHeader(DoctorModel doctor) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Center(
              child: Text(
                doctor.fullName.isNotEmpty
                    ? doctor.fullName[0].toUpperCase()
                    : 'D',
                style: AppTextStyles.displaySmall
                    .copyWith(color: AppColors.primary),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            doctor.fullName,
            style: AppTextStyles.headingMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              doctor.crmFormatted,
              style:
                  AppTextStyles.labelMedium.copyWith(color: AppColors.primary),
            ),
          ),
          if (doctor.city != null || doctor.state != null) ...[
            const SizedBox(height: 8),
            Text(
              [doctor.city, doctor.state]
                  .where((e) => e != null)
                  .join(', '),
              style: AppTextStyles.bodySmall,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionButtons(DoctorModel doctor) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: FilledButton.icon(
              onPressed: () {
                ref.read(connectionProvider.notifier).sendRequest(doctor.id);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Pedido de conexao enviado')),
                );
              },
              icon: const Icon(Icons.person_add_outlined, size: 18),
              label: const Text('Conectar'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () {
                context.push('/chat/${doctor.id}', extra: {
                  'otherUserName': doctor.fullName,
                  'otherUserId': doctor.id,
                });
              },
              icon: const Icon(Icons.chat_outlined, size: 18),
              label: const Text('Mensagem'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            onPressed: () {
              ref.read(connectionProvider.notifier).follow(doctor.id);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Seguindo')),
              );
            },
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Seguir'),
          ),
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
            children: items
                .map((item) => Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        item,
                        style: AppTextStyles.labelMedium
                            .copyWith(color: AppColors.primary),
                      ),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSkillsWithEndorsements(DoctorModel doctor) {
    final skills = doctor.skills
        .map((s) => s.name ?? '')
        .where((n) => n.isNotEmpty)
        .toList();

    // Build endorsement count map
    final endorsementMap = <String, int>{};
    for (final e in _endorsements) {
      final skill = e['skill'] as String? ?? '';
      final count = e['endorsementCount'];
      endorsementMap[skill] = count is int
          ? count
          : (count is Map ? (count['low'] ?? 0) : 0);
    }

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
          Text('Habilidades', style: AppTextStyles.titleMedium),
          const SizedBox(height: 12),
          ...skills.map((skill) {
            final endorseCount = endorsementMap[skill] ?? 0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              skill,
                              style: AppTextStyles.labelMedium
                                  .copyWith(color: AppColors.primary),
                            ),
                          ),
                          if (endorseCount > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '$endorseCount',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 32,
                    child: OutlinedButton(
                      onPressed: () async {
                        try {
                          final connRepo =
                              ref.read(connectionRepositoryProvider);
                          await connRepo.endorseSkill(
                              widget.doctorId, skill);
                          await _loadEndorsements();
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                  content:
                                      Text('Endossou "$skill"')),
                            );
                          }
                        } catch (_) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content:
                                      Text('Erro ao endossar')),
                            );
                          }
                        }
                      },
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        minimumSize: Size.zero,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.thumb_up_outlined, size: 14),
                          SizedBox(width: 4),
                          Text('Endossar', style: TextStyle(fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildExperienceSection(List<DoctorExperience> experiences) {
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
          Text('Experiencia', style: AppTextStyles.titleMedium),
          const SizedBox(height: 12),
          ...experiences.map((exp) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.only(top: 6, right: 12),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(exp.role,
                              style: AppTextStyles.bodyMedium
                                  .copyWith(fontWeight: FontWeight.w600)),
                          if (exp.description != null)
                            Text(exp.description!,
                                style: AppTextStyles.bodySmall),
                          Text(
                            exp.isCurrent
                                ? 'Desde ${exp.startDate}'
                                : '${exp.startDate} - ${exp.endDate ?? ""}',
                            style: AppTextStyles.labelSmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}
