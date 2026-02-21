import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/job_provider.dart';
import '../../../core/models/job_model.dart';

class JobsScreen extends ConsumerStatefulWidget {
  const JobsScreen({super.key});

  @override
  ConsumerState<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends ConsumerState<JobsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(jobProvider.notifier).loadJobs());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(jobProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.jobs.isEmpty
              ? _buildErrorState(state.error!)
              : _buildJobsList(state),
    );
  }

  Future<void> _applyToJob(JobModel job) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Candidatar-se'),
        content: Text(
          'Deseja se candidatar para a vaga "${job.title}"${job.institutionName != null ? ' em ${job.institutionName}' : ''}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Candidatar-se'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final success = await ref.read(jobProvider.notifier).applyToJob(job.id);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success
              ? '✓ Candidatura enviada para ${job.title}!'
              : 'Não foi possível enviar a candidatura. Tente novamente.',
        ),
        backgroundColor: success ? AppColors.success : AppColors.error,
        behavior: SnackBarBehavior.floating,
      ),
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
            onPressed: () => ref.read(jobProvider.notifier).loadJobs(),
            child: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }

  Widget _buildJobsList(dynamic state) {
    final jobs = state.jobs.isNotEmpty ? state.jobs : state.recommended;

    if (jobs.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.work_outline, size: 64, color: AppColors.textTertiary),
            SizedBox(height: 16),
            Text('Nenhuma vaga encontrada', style: TextStyle(color: AppColors.textSecondary)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(jobProvider.notifier).loadJobs(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: jobs.length,
        itemBuilder: (context, index) => _buildJobCard(jobs[index]),
      ),
    );
  }

  Widget _buildJobCard(JobModel job) {
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
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  job.type,
                  style: AppTextStyles.labelSmall.copyWith(color: AppColors.primary),
                ),
              ),
              const Spacer(),
              Text(
                job.salaryFormatted,
                style: AppTextStyles.titleMedium.copyWith(color: AppColors.success),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(job.title, style: AppTextStyles.titleLarge),
          const SizedBox(height: 4),
          Text(job.institutionName ?? '', style: AppTextStyles.bodyMedium),
          if (job.city != null || job.state != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.location_on_outlined, size: 16, color: AppColors.textTertiary),
                const SizedBox(width: 4),
                Text(
                  [job.city, job.state].where((e) => e != null).join(', '),
                  style: AppTextStyles.bodySmall,
                ),
              ],
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => _applyToJob(job),
              child: const Text('Candidatar-se'),
            ),
          ),
        ],
      ),
    );
  }
}