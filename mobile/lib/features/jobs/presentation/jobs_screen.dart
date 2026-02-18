import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
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
      appBar: AppBar(
        title: const Text('Vagas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilters(context),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.jobs.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(state.error!),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () =>
                            ref.read(jobProvider.notifier).loadJobs(),
                        child: const Text('Tentar novamente'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => ref.read(jobProvider.notifier).loadJobs(),
                  child: Column(
                    children: [
                      if (state.recommended.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.all(16),
                          color: AppColors.primaryLight.withOpacity(0.2),
                          child: Row(
                            children: [
                              const Icon(Icons.auto_awesome,
                                  color: AppColors.primary),
                              const SizedBox(width: 8),
                              Text(
                                '${state.recommended.length} vagas recomendadas para seu perfil',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      Expanded(
                        child: state.jobs.isEmpty && state.recommended.isEmpty
                            ? const Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.work_outline,
                                        size: 64,
                                        color: AppColors.textSecondary),
                                    SizedBox(height: 16),
                                    Text('Nenhuma vaga encontrada',
                                        style: TextStyle(
                                            color: AppColors.textSecondary)),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: state.jobs.isNotEmpty
                                    ? state.jobs.length
                                    : state.recommended.length,
                                itemBuilder: (context, index) {
                                  final job = state.jobs.isNotEmpty
                                      ? state.jobs[index]
                                      : state.recommended[index];
                                  return _buildJobCard(context, job);
                                },
                              ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildJobCard(BuildContext context, JobModel job) {
    final isPlantao = job.type == 'SHIFT' || job.type == 'PLANTAO';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isPlantao
                        ? AppColors.warning.withOpacity(0.15)
                        : AppColors.accent.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    job.type,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isPlantao ? AppColors.warning : AppColors.accent,
                    ),
                  ),
                ),
                if (job.shift.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      job.shift,
                      style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary),
                    ),
                  ),
                ],
                const Spacer(),
                Text(
                  timeago.format(job.createdAt, locale: 'pt_BR'),
                  style: TextStyle(
                      fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              job.title,
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            if (job.institutionName != null) ...[
              const SizedBox(height: 4),
              Text(
                job.institutionName!,
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.location_on_outlined,
                    size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text('${job.city}, ${job.state}',
                    style: TextStyle(
                        fontSize: 13, color: AppColors.textSecondary)),
                const SizedBox(width: 16),
                Icon(Icons.attach_money,
                    size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text(job.salaryFormatted,
                    style: TextStyle(
                        fontSize: 13, color: AppColors.textSecondary)),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _showApplyDialog(context, job),
                style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 42)),
                child: const Text('Candidatar-se'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showApplyDialog(BuildContext context, JobModel job) {
    final coverController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Candidatar-se a\n${job.title}',
            style: const TextStyle(fontSize: 16)),
        content: TextField(
          controller: coverController,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Carta de apresentação (opcional)',
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () async {
              final success = await ref
                  .read(jobProvider.notifier)
                  .applyToJob(job.id, coverLetter: coverController.text);
              if (ctx.mounted) {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(success
                      ? 'Candidatura enviada!'
                      : 'Erro ao enviar candidatura'),
                  backgroundColor: success ? AppColors.accent : AppColors.error,
                ));
              }
            },
            child: const Text('Enviar'),
          ),
        ],
      ),
    );
  }

  void _showFilters(BuildContext context) {
    String? selectedType;
    String? selectedShift;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Filtrar Vagas',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),
              const Text('Tipo',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  FilterChip(
                    label: const Text('Plantão'),
                    selected: selectedType == 'SHIFT',
                    onSelected: (v) => setSheetState(
                        () => selectedType = v ? 'SHIFT' : null),
                  ),
                  FilterChip(
                    label: const Text('Consulta'),
                    selected: selectedType == 'CONSULTATION',
                    onSelected: (v) => setSheetState(
                        () => selectedType = v ? 'CONSULTATION' : null),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text('Turno',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  FilterChip(
                    label: const Text('Diurno'),
                    selected: selectedShift == 'DAY',
                    onSelected: (v) =>
                        setSheetState(() => selectedShift = v ? 'DAY' : null),
                  ),
                  FilterChip(
                    label: const Text('Noturno'),
                    selected: selectedShift == 'NIGHT',
                    onSelected: (v) => setSheetState(
                        () => selectedShift = v ? 'NIGHT' : null),
                  ),
                  FilterChip(
                    label: const Text('Integral'),
                    selected: selectedShift == 'FULL',
                    onSelected: (v) => setSheetState(
                        () => selectedShift = v ? 'FULL' : null),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  ref.read(jobProvider.notifier).setFilters(
                      type: selectedType, shift: selectedShift);
                  Navigator.pop(ctx);
                },
                child: const Text('Aplicar Filtros'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
