import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/repositories/institution_workforce_repository.dart';

class InstitutionHomeScreen extends ConsumerStatefulWidget {
  const InstitutionHomeScreen({super.key});

  @override
  ConsumerState<InstitutionHomeScreen> createState() => _InstitutionHomeScreenState();
}

class _InstitutionHomeScreenState extends ConsumerState<InstitutionHomeScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final institutionId = ref.read(institutionIdProvider);
      if (institutionId != null) {
        ref.read(institutionDashboardProvider(institutionId).notifier).loadAll();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final institutionId = ref.watch(institutionIdProvider);

    if (institutionId == null) {
      return _buildNoInstitutionError();
    }

    final state = ref.watch(institutionDashboardProvider(institutionId));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(institutionDashboardProvider(institutionId).notifier).loadAll(),
        child: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverToBoxAdapter(
              child: _Header(institutionId: institutionId, state: state),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _TabBarDelegate(
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  indicatorWeight: 2,
                  labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  tabs: const [
                    Tab(text: 'Painel'),
                    Tab(text: 'Profissionais'),
                    Tab(text: 'Contratos'),
                    Tab(text: 'Contatos CRM'),
                  ],
                ),
              ),
            ),
          ],
          body: TabBarView(
            controller: _tabController,
            children: [
              _DashboardTab(state: state, institutionId: institutionId, tabController: _tabController),
              _WorkforceSearchTab(institutionId: institutionId),
              _ContractsTab(state: state),
              _ContactsTab(institutionId: institutionId, state: state),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNoInstitutionError() {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.business_outlined, size: 64, color: AppColors.textTertiary),
            const SizedBox(height: 16),
            Text('Nenhuma instituição associada', style: AppTextStyles.headingSmall),
            const SizedBox(height: 8),
            Text('Sua conta não está vinculada a uma instituição.',
                style: AppTextStyles.bodySmall, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

// ─── Header with KPIs ────────────────────────────────────────────────────────

class _Header extends StatelessWidget {
  final String institutionId;
  final InstitutionDashboardState state;

  const _Header({required this.institutionId, required this.state});

  @override
  Widget build(BuildContext context) {
    final kpis = state.kpis;

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 56, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Painel da Instituição', style: AppTextStyles.headingMedium),
                    const SizedBox(height: 4),
                    Text(
                      DateFormat("EEEE, d 'de' MMMM", 'pt_BR').format(DateTime.now()),
                      style: AppTextStyles.bodySmall,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Stack(
                  children: [
                    const Icon(Icons.notifications_outlined),
                    if ((state.kpis?.pendingFollowUps ?? 0) > 0)
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.error,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                  ],
                ),
                onPressed: () => context.go('/notifications'),
              ),
            ],
          ),
          if (kpis != null) ...[
            const SizedBox(height: 16),
            _KpiGrid(kpis: kpis),
          ] else if (state.isLoading) ...[
            const SizedBox(height: 16),
            const LinearProgressIndicator(),
          ],
        ],
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  final InstitutionKpis kpis;

  const _KpiGrid({required this.kpis});

  @override
  Widget build(BuildContext context) {
    final coverageColor = kpis.coverageRate >= 80
        ? AppColors.success
        : kpis.coverageRate >= 60
            ? AppColors.warning
            : AppColors.error;

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: MediaQuery.of(context).size.width > 600 ? 4 : 2,
      childAspectRatio: 1.6,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      children: [
        _KpiCard(
          icon: Icons.description_outlined,
          value: '${kpis.activeContracts}',
          label: 'Contratos Ativos',
          color: AppColors.primary,
        ),
        _KpiCard(
          icon: Icons.calendar_month,
          value: '${kpis.coverageRate}%',
          label: 'Cobertura 7 dias',
          color: coverageColor,
        ),
        _KpiCard(
          icon: Icons.work_outline,
          value: '${kpis.openJobs}',
          label: 'Vagas Abertas',
          color: AppColors.accent,
        ),
        _KpiCard(
          icon: Icons.contact_phone_outlined,
          value: '${kpis.pendingFollowUps}',
          label: 'Follow-ups',
          color: kpis.pendingFollowUps > 0 ? AppColors.warning : AppColors.textTertiary,
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const _KpiCard({required this.icon, required this.value, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, size: 20, color: color),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
              Text(label, style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

class _DashboardTab extends ConsumerWidget {
  final InstitutionDashboardState state;
  final String institutionId;
  final TabController tabController;

  const _DashboardTab({required this.state, required this.institutionId, required this.tabController});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Coverage alerts
        if ((state.kpis?.uncoveredShifts ?? 0) > 0)
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.warningLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                Icon(Icons.warning_amber, color: AppColors.warning),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${state.kpis!.uncoveredShifts} turnos sem cobertura',
                          style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.warning)),
                      const Text('Nos próximos 7 dias', style: TextStyle(fontSize: 12)),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => tabController.animateTo(0),
                  child: const Text('Gerenciar'),
                ),
              ],
            ),
          ),

        // Quick actions
        Text('Ações Rápidas', style: AppTextStyles.titleLarge),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          childAspectRatio: 1.8,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          children: [
            _QuickActionCard(
              icon: Icons.person_search_outlined,
              label: 'Buscar Profissional',
              color: AppColors.primary,
              onTap: () => tabController.animateTo(1),
            ),
            _QuickActionCard(
              icon: Icons.add_circle_outline,
              label: 'Novo Contrato',
              color: AppColors.success,
              onTap: () => tabController.animateTo(2),
            ),
            _QuickActionCard(
              icon: Icons.calendar_today_outlined,
              label: 'Criar Plantão',
              color: AppColors.accent,
              onTap: () => tabController.animateTo(1),
            ),
            _QuickActionCard(
              icon: Icons.contact_phone_outlined,
              label: 'Registrar Contato',
              color: AppColors.warning,
              onTap: () => tabController.animateTo(3),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // Follow-ups section
        if (state.followUps.isNotEmpty) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Follow-ups Pendentes', style: AppTextStyles.titleLarge),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.warningLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('${state.followUps.length}',
                    style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...state.followUps.take(3).map((fu) => _FollowUpCard(contact: fu)),
        ],
      ],
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label,
                style: AppTextStyles.labelLarge.copyWith(fontSize: 13),
                maxLines: 2),
          ),
        ]),
      ),
    );
  }
}

class _FollowUpCard extends StatelessWidget {
  final ContactLogModel contact;

  const _FollowUpCard({required this.contact});

  @override
  Widget build(BuildContext context) {
    final doctorName = contact.doctor?['fullName'] ?? 'Médico';
    final followUpDate = contact.followUpDate;
    final isOverdue = followUpDate != null && followUpDate.isBefore(DateTime.now());

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isOverdue ? AppColors.error.withValues(alpha: 0.3) : AppColors.border),
      ),
      child: Row(children: [
        CircleAvatar(
          radius: 18,
          backgroundColor: AppColors.primaryLight,
          child: Text(doctorName[0].toUpperCase(),
              style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(doctorName, style: AppTextStyles.titleSmall),
            if (followUpDate != null)
              Text(
                isOverdue
                    ? 'Vencido: ${DateFormat('d MMM', 'pt_BR').format(followUpDate)}'
                    : 'Até: ${DateFormat('d MMM', 'pt_BR').format(followUpDate)}',
                style: TextStyle(fontSize: 11, color: isOverdue ? AppColors.error : AppColors.textSecondary),
              ),
          ]),
        ),
        _OutcomeBadge(outcome: contact.outcome),
      ]),
    );
  }
}

// ─── Workforce Search Tab ────────────────────────────────────────────────────

class _WorkforceSearchTab extends ConsumerStatefulWidget {
  final String institutionId;

  const _WorkforceSearchTab({required this.institutionId});

  @override
  ConsumerState<_WorkforceSearchTab> createState() => _WorkforceSearchTabState();
}

class _WorkforceSearchTabState extends ConsumerState<_WorkforceSearchTab> {
  final _specialtyController = TextEditingController();
  bool _hasSearched = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(institutionDashboardProvider(widget.institutionId));

    return Column(
      children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              TextField(
                controller: _specialtyController,
                decoration: InputDecoration(
                  hintText: 'Buscar por especialidade (ex: Cardiologista)',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.search),
                    onPressed: _runSearch,
                  ),
                ),
                onSubmitted: (_) => _runSearch(),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.info_outline, size: 14, color: AppColors.textTertiary),
                  const SizedBox(width: 6),
                  Text('Médicos disponíveis sem conflito de agenda',
                      style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                ],
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: _hasSearched
              ? _SearchResults(doctors: state.searchResults, institutionId: widget.institutionId)
              : _SearchEmptyState(onSearch: () {
                  _specialtyController.text = '';
                  _runSearch();
                }),
        ),
      ],
    );
  }

  void _runSearch() {
    setState(() => _hasSearched = true);
    ref.read(institutionDashboardProvider(widget.institutionId).notifier).searchWorkforce(
          specialtyName: _specialtyController.text.isNotEmpty ? _specialtyController.text : null,
        );
  }
}

class _SearchEmptyState extends StatelessWidget {
  final VoidCallback onSearch;

  const _SearchEmptyState({required this.onSearch});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.person_search, size: 56, color: AppColors.textTertiary),
        const SizedBox(height: 12),
        Text('Busque profissionais disponíveis', style: AppTextStyles.titleMedium),
        const SizedBox(height: 8),
        Text('Digite uma especialidade e pressione buscar',
            style: AppTextStyles.bodySmall, textAlign: TextAlign.center),
        const SizedBox(height: 16),
        ElevatedButton(onPressed: onSearch, child: const Text('Ver todos os médicos')),
      ]),
    );
  }
}

class _SearchResults extends ConsumerWidget {
  final List<WorkforceDoctor> doctors;
  final String institutionId;

  const _SearchResults({required this.doctors, required this.institutionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (doctors.isEmpty) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.search_off, size: 48, color: AppColors.textTertiary),
          const SizedBox(height: 12),
          Text('Nenhum médico encontrado', style: AppTextStyles.titleMedium),
        ]),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: doctors.length,
      itemBuilder: (context, i) => _DoctorCard(
        doctor: doctors[i],
        institutionId: institutionId,
      ),
    );
  }
}

class _DoctorCard extends ConsumerWidget {
  final WorkforceDoctor doctor;
  final String institutionId;

  const _DoctorCard({required this.doctor, required this.institutionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primaryLight,
            backgroundImage: doctor.profilePicUrl != null
                ? NetworkImage(doctor.profilePicUrl!)
                : null,
            child: doctor.profilePicUrl == null
                ? Text(doctor.fullName[0].toUpperCase(),
                    style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold))
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Text(doctor.fullName, style: AppTextStyles.titleMedium),
                  if (doctor.hasActiveContract) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.successLight,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text('Contrato ativo',
                          style: TextStyle(fontSize: 10, color: AppColors.success, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ]),
                const SizedBox(height: 2),
                if (doctor.specialties.isNotEmpty)
                  Text(doctor.specialties.join(' · '),
                      style: AppTextStyles.bodySmall,
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                if (doctor.city != null)
                  Text(doctor.city!, style: AppTextStyles.labelSmall),
              ],
            ),
          ),
          Column(
            children: [
              if (doctor.lastContactOutcome != null)
                _OutcomeBadge(outcome: doctor.lastContactOutcome!),
              const SizedBox(height: 6),
              PopupMenuButton<String>(
                onSelected: (action) => _handleAction(context, ref, action),
                itemBuilder: (_) => [
                  const PopupMenuItem(value: 'view', child: Text('Ver perfil')),
                  const PopupMenuItem(value: 'contact', child: Text('Registrar contato')),
                  const PopupMenuItem(value: 'invite', child: Text('Convidar para vaga')),
                ],
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.more_horiz, size: 18),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _handleAction(BuildContext context, WidgetRef ref, String action) {
    switch (action) {
      case 'view':
        context.go('/doctor/${doctor.id}');
        break;
      case 'contact':
        _showContactDialog(context, ref);
        break;
      case 'invite':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Convite enviado para ${doctor.fullName}')),
        );
        break;
    }
  }

  void _showContactDialog(BuildContext context, WidgetRef ref) {
    final notesController = TextEditingController();
    String selectedOutcome = 'CONTACTED';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Registrar Contato - ${doctor.fullName}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              value: selectedOutcome,
              items: const [
                DropdownMenuItem(value: 'CONTACTED', child: Text('Contatado')),
                DropdownMenuItem(value: 'INTERESTED', child: Text('Interessado')),
                DropdownMenuItem(value: 'DECLINED', child: Text('Recusou')),
                DropdownMenuItem(value: 'NO_RESPONSE', child: Text('Sem resposta')),
              ],
              onChanged: (v) => selectedOutcome = v!,
              decoration: const InputDecoration(labelText: 'Resultado'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(labelText: 'Notas'),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final repo = ref.read(institutionWorkforceRepositoryProvider);
              await repo.logContact(
                institutionId,
                doctorId: doctor.id,
                type: 'IN_APP',
                outcome: selectedOutcome,
                notes: notesController.text.isNotEmpty ? notesController.text : null,
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Contato registrado!')),
                );
              }
            },
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
  }
}

// ─── Contracts Tab ────────────────────────────────────────────────────────────

class _ContractsTab extends StatelessWidget {
  final InstitutionDashboardState state;

  const _ContractsTab({required this.state});

  @override
  Widget build(BuildContext context) {
    final contracts = state.contracts;

    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (contracts.isEmpty) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.description_outlined, size: 56, color: AppColors.textTertiary),
          const SizedBox(height: 12),
          Text('Nenhum contrato cadastrado', style: AppTextStyles.titleMedium),
        ]),
      );
    }

    // Group by status
    final active = contracts.where((c) => c.status == 'ACTIVE').toList();
    final pending = contracts.where((c) => c.status == 'PENDING_SIGNATURE').toList();
    final expired = contracts.where((c) => c.status == 'EXPIRED').toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (active.isNotEmpty) ...[
          _SectionHeader(label: 'Ativos', count: active.length, color: AppColors.success),
          ...active.map((c) => _ContractCard(contract: c)),
          const SizedBox(height: 12),
        ],
        if (pending.isNotEmpty) ...[
          _SectionHeader(label: 'Aguardando Assinatura', count: pending.length, color: AppColors.warning),
          ...pending.map((c) => _ContractCard(contract: c)),
          const SizedBox(height: 12),
        ],
        if (expired.isNotEmpty) ...[
          _SectionHeader(label: 'Vencidos', count: expired.length, color: AppColors.textTertiary),
          ...expired.map((c) => _ContractCard(contract: c)),
        ],
      ],
    );
  }
}

class _ContractCard extends StatelessWidget {
  final ContractModel contract;

  const _ContractCard({required this.contract});

  @override
  Widget build(BuildContext context) {
    final doctorName = contract.doctor?['fullName'] ?? 'Médico';
    final isExpiringSoon = contract.endDate != null &&
        contract.endDate!.isBefore(DateTime.now().add(const Duration(days: 30))) &&
        contract.status == 'ACTIVE';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isExpiringSoon ? AppColors.warning.withValues(alpha: 0.5) : AppColors.border,
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: AppColors.primaryLight,
            child: Text(doctorName[0].toUpperCase(),
                style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(doctorName, style: AppTextStyles.titleSmall),
                const SizedBox(height: 2),
                Row(children: [
                  _TypeBadge(type: contract.type),
                  const SizedBox(width: 6),
                  if (contract.specialty != null)
                    Text(contract.specialty!['name'] ?? '',
                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                ]),
                if (contract.endDate != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    isExpiringSoon
                        ? '⚠️ Vence ${DateFormat('d MMM yyyy', 'pt_BR').format(contract.endDate!)}'
                        : 'Até ${DateFormat('d MMM yyyy', 'pt_BR').format(contract.endDate!)}',
                    style: TextStyle(
                      fontSize: 11,
                      color: isExpiringSoon ? AppColors.warning : AppColors.textTertiary,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (contract.monthlyRate != null || contract.hourlyRate != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  contract.monthlyRate != null
                      ? 'R\$${contract.monthlyRate!.toStringAsFixed(0)}/mês'
                      : 'R\$${contract.hourlyRate!.toStringAsFixed(0)}/h',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _TypeBadge extends StatelessWidget {
  final String type;

  const _TypeBadge({required this.type});

  @override
  Widget build(BuildContext context) {
    const colors = {
      'CLT': Color(0xFF1565C0),
      'PJ': Color(0xFF6A1B9A),
      'COOPERATIVA': Color(0xFF2E7D32),
      'TEMPORARIO': Color(0xFFE65100),
      'AUTONOMO': Color(0xFF00838F),
    };
    final color = colors[type] ?? AppColors.textSecondary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(type, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
    );
  }
}

// ─── Contacts CRM Tab ─────────────────────────────────────────────────────────

class _ContactsTab extends ConsumerWidget {
  final String institutionId;
  final InstitutionDashboardState state;

  const _ContactsTab({required this.institutionId, required this.state});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contacts = state.followUps;

    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (contacts.isEmpty)
          Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const SizedBox(height: 40),
              Icon(Icons.contact_phone_outlined, size: 56, color: AppColors.textTertiary),
              const SizedBox(height: 12),
              Text('Nenhum follow-up pendente', style: AppTextStyles.titleMedium),
            ]),
          )
        else ...[
          Text('Follow-ups Pendentes', style: AppTextStyles.titleLarge),
          const SizedBox(height: 8),
          ...contacts.map((c) => _ContactCard(contact: c)),
        ],
      ],
    );
  }
}

class _ContactCard extends StatelessWidget {
  final ContactLogModel contact;

  const _ContactCard({required this.contact});

  @override
  Widget build(BuildContext context) {
    final doctorName = contact.doctor?['fullName'] ?? 'Médico';
    final followUpDate = contact.followUpDate;
    final isOverdue = followUpDate != null && followUpDate.isBefore(DateTime.now());

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isOverdue ? AppColors.error.withValues(alpha: 0.3) : AppColors.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primaryLight,
              child: Text(doctorName[0].toUpperCase(),
                  style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(doctorName, style: AppTextStyles.titleSmall),
                Text(_contactTypeLabel(contact.type),
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              ]),
            ),
            _OutcomeBadge(outcome: contact.outcome),
          ]),
          if (contact.notes != null) ...[
            const SizedBox(height: 8),
            Text(contact.notes!, style: AppTextStyles.bodySmall, maxLines: 2),
          ],
          if (followUpDate != null) ...[
            const SizedBox(height: 6),
            Row(children: [
              Icon(
                isOverdue ? Icons.warning_amber : Icons.calendar_today_outlined,
                size: 13,
                color: isOverdue ? AppColors.error : AppColors.textTertiary,
              ),
              const SizedBox(width: 4),
              Text(
                isOverdue
                    ? 'Vencido: ${DateFormat('d MMM', 'pt_BR').format(followUpDate)}'
                    : 'Follow-up: ${DateFormat('d MMM', 'pt_BR').format(followUpDate)}',
                style: TextStyle(
                  fontSize: 11,
                  color: isOverdue ? AppColors.error : AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ]),
          ],
        ],
      ),
    );
  }

  String _contactTypeLabel(String type) {
    const map = {
      'PHONE': 'Ligação',
      'EMAIL': 'E-mail',
      'IN_APP': 'Mensagem no app',
      'WHATSAPP': 'WhatsApp',
      'IN_PERSON': 'Presencial',
    };
    return map[type] ?? type;
  }
}

// ─── Shared widgets ───────────────────────────────────────────────────────────

class _OutcomeBadge extends StatelessWidget {
  final String outcome;

  const _OutcomeBadge({required this.outcome});

  @override
  Widget build(BuildContext context) {
    const map = {
      'CONTACTED': ('Contatado', Color(0xFF1976D2), Color(0xFFBBDEFB)),
      'INTERESTED': ('Interessado', Color(0xFF2E7D32), Color(0xFFC8E6C9)),
      'DECLINED': ('Recusou', Color(0xFFC62828), Color(0xFFFFCDD2)),
      'NO_RESPONSE': ('Sem resposta', Color(0xFF616161), Color(0xFFEEEEEE)),
      'SCHEDULED_INTERVIEW': ('Entrevista agendada', Color(0xFFE65100), Color(0xFFFFE0B2)),
      'HIRED': ('Contratado', Color(0xFF1B5E20), Color(0xFFA5D6A7)),
    };
    final style = map[outcome] ?? ('Desconhecido', AppColors.textTertiary, AppColors.surfaceVariant);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: style.$3,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(style.$1,
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: style.$2)),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _SectionHeader({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Text(label, style: AppTextStyles.titleSmall.copyWith(color: AppColors.textPrimary)),
        const SizedBox(width: 6),
        Text('($count)', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
      ]),
    );
  }
}

// ─── Tab bar delegate ────────────────────────────────────────────────────────

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}
