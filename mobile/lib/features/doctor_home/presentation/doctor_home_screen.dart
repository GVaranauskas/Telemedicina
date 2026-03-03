import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/repositories/agenda_repository.dart';
import '../../../core/providers/appointment_provider.dart';

class DoctorHomeScreen extends ConsumerStatefulWidget {
  const DoctorHomeScreen({super.key});

  @override
  ConsumerState<DoctorHomeScreen> createState() => _DoctorHomeScreenState();
}

class _DoctorHomeScreenState extends ConsumerState<DoctorHomeScreen> {
  DateTime _selectedDay = DateTime.now();

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(agendaProvider.notifier).loadAgenda());
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final agendaState = ref.watch(agendaProvider);
    final firstName = user?.fullName?.split(' ').first ?? 'Médico';
    final width = MediaQuery.of(context).size.width;
    final isWide = width >= 900;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: () => ref.read(agendaProvider.notifier).loadAgenda(),
        child: CustomScrollView(
          slivers: [
            // ─── Header ─────────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(20, 56, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _greeting(firstName),
                                style: AppTextStyles.displaySmall.copyWith(fontSize: 22),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                DateFormat("EEEE, d 'de' MMMM", 'pt_BR').format(DateTime.now()),
                                style: AppTextStyles.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.notifications_outlined),
                              onPressed: () => context.go('/notifications'),
                            ),
                            IconButton(
                              icon: const Icon(Icons.chat_bubble_outline),
                              onPressed: () => context.go('/chat'),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Quick stats row
                    if (!agendaState.isLoading && agendaState.data != null)
                      _QuickStatsRow(data: agendaState.data!),
                  ],
                ),
              ),
            ),

            // ─── Weekly Calendar ─────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Minha Agenda', style: AppTextStyles.headingSmall),
                        TextButton.icon(
                          onPressed: () => context.go('/doctor-home'),
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Bloquear Data'),
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            textStyle: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _WeekStrip(
                      selectedDay: _selectedDay,
                      agendaData: agendaState.data,
                      onDaySelected: (d) => setState(() => _selectedDay = d),
                    ),
                  ],
                ),
              ),
            ),

            // ─── Day appointments ────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _dayLabel(_selectedDay),
                      style: AppTextStyles.titleLarge,
                    ),
                  ],
                ),
              ),
            ),

            if (agendaState.isLoading)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: CircularProgressIndicator()),
                ),
              )
            else if (agendaState.error != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: _ErrorCard(error: agendaState.error!),
                ),
              )
            else ...[
              _DayAgendaList(
                selectedDay: _selectedDay,
                agendaData: agendaState.data,
              ),
            ],

            // ─── Separator ───────────────────────────────────────────────────
            const SliverToBoxAdapter(child: SizedBox(height: 8)),

            // ─── Connections & Jobs row ───────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: isWide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: _ConnectionsSection()),
                          const SizedBox(width: 16),
                          Expanded(child: _JobsSection()),
                        ],
                      )
                    : Column(
                        children: [
                          _ConnectionsSection(),
                          const SizedBox(height: 16),
                          _JobsSection(),
                        ],
                      ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }

  String _greeting(String name) {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Bom dia, Dr. $name 👋';
    if (hour < 18) return 'Boa tarde, Dr. $name 👋';
    return 'Boa noite, Dr. $name 👋';
  }

  String _dayLabel(DateTime d) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final selected = DateTime(d.year, d.month, d.day);
    if (selected == today) return 'Hoje';
    if (selected == today.add(const Duration(days: 1))) return 'Amanhã';
    return DateFormat("EEEE, d MMM", 'pt_BR').format(d);
  }
}

// ─── Quick Stats Row ─────────────────────────────────────────────────────────

class _QuickStatsRow extends StatelessWidget {
  final DoctorAgendaData data;

  const _QuickStatsRow({required this.data});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final todayAppts = data.appointments.where((a) {
      final d = DateTime(a.date.year, a.date.month, a.date.day);
      return d == DateTime(now.year, now.month, now.day);
    }).length;
    final thisWeekShifts = data.shifts.length;
    final activeBlocks = data.blocks.length;

    return Row(
      children: [
        _StatChip(icon: Icons.calendar_today, label: '$todayAppts hoje', color: AppColors.primary),
        const SizedBox(width: 8),
        _StatChip(icon: Icons.nights_stay_outlined, label: '$thisWeekShifts plantões', color: AppColors.accent),
        const SizedBox(width: 8),
        if (activeBlocks > 0)
          _StatChip(icon: Icons.block, label: '$activeBlocks bloqueios', color: AppColors.warning),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _StatChip({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

// ─── Week Strip ──────────────────────────────────────────────────────────────

class _WeekStrip extends StatelessWidget {
  final DateTime selectedDay;
  final DoctorAgendaData? agendaData;
  final ValueChanged<DateTime> onDaySelected;

  const _WeekStrip({required this.selectedDay, this.agendaData, required this.onDaySelected});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
    final days = List.generate(14, (i) => startOfWeek.add(Duration(days: i)));

    return SizedBox(
      height: 72,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: days.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final day = days[i];
          final isSelected = DateTime(day.year, day.month, day.day) ==
              DateTime(selectedDay.year, selectedDay.month, selectedDay.day);
          final isToday = DateTime(day.year, day.month, day.day) ==
              DateTime(now.year, now.month, now.day);
          final hasItems = agendaData?.hasItemsOnDate(day) ?? false;

          return GestureDetector(
            onTap: () => onDaySelected(day),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 48,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
                border: isToday && !isSelected
                    ? Border.all(color: AppColors.primary, width: 1.5)
                    : null,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    DateFormat('E', 'pt_BR').format(day).substring(0, 3),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? Colors.white : AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${day.day}',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (hasItems)
                    Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.white70 : AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─── Day Agenda List ─────────────────────────────────────────────────────────

class _DayAgendaList extends StatelessWidget {
  final DateTime selectedDay;
  final DoctorAgendaData? agendaData;

  const _DayAgendaList({required this.selectedDay, this.agendaData});

  @override
  Widget build(BuildContext context) {
    final items = agendaData?.itemsForDate(selectedDay) ?? [];

    if (items.isEmpty) {
      return SliverToBoxAdapter(
        child: Container(
          margin: const EdgeInsets.all(20),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              Icon(Icons.event_available, size: 48, color: AppColors.textTertiary),
              const SizedBox(height: 12),
              Text('Nenhum compromisso neste dia', style: AppTextStyles.bodySmall),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => context.go('/profile'),
                child: const Text('Configurar disponibilidade'),
              ),
            ],
          ),
        ),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, i) => Padding(
          padding: EdgeInsets.fromLTRB(20, i == 0 ? 12 : 6, 20, 6),
          child: _AgendaItemCard(item: items[i]),
        ),
        childCount: items.length,
      ),
    );
  }
}

class _AgendaItemCard extends StatelessWidget {
  final AgendaItem item;

  const _AgendaItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    Color accentColor;
    IconData icon;
    String title;
    String subtitle;

    if (item.isAppointment) {
      accentColor = AppColors.primary;
      icon = Icons.person_outlined;
      title = item.patient?['fullName'] ?? 'Consulta';
      subtitle = item.workplace?['name'] ?? '';
    } else if (item.isShift) {
      accentColor = AppColors.accent;
      icon = Icons.nights_stay_outlined;
      title = _shiftLabel(item.shiftType ?? '');
      subtitle = '${item.institution?['name'] ?? ''} · ${item.startTime ?? ''}-${item.endTime ?? ''}';
    } else {
      accentColor = AppColors.warning;
      icon = Icons.block;
      title = item.reason ?? 'Bloqueio';
      subtitle = _blockLabel(item.blockType ?? '');
    }

    final timeStr = item.isAppointment
        ? DateFormat('HH:mm').format(item.date)
        : item.startTime ?? '';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: accentColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTextStyles.titleMedium),
                if (subtitle.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(subtitle, style: AppTextStyles.bodySmall),
                ],
              ],
            ),
          ),
          if (timeStr.isNotEmpty) ...[
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(timeStr,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: accentColor,
                    )),
                if (item.status != null) ...[
                  const SizedBox(height: 2),
                  _StatusBadge(status: item.status!),
                ],
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _shiftLabel(String type) {
    const map = {
      'PLANTAO_12H': 'Plantão 12h',
      'PLANTAO_24H': 'Plantão 24h',
      'CONSULTA': 'Consultas',
      'SOBREAVISO': 'Sobreaviso',
      'CIRURGIA': 'Cirurgia',
      'VISITA': 'Visita',
    };
    return map[type] ?? type;
  }

  String _blockLabel(String type) {
    const map = {
      'VACATION': 'Férias',
      'CONFERENCE': 'Congresso/Conferência',
      'PERSONAL': 'Pessoal',
      'SICK_LEAVE': 'Licença Médica',
      'MATERNITY_LEAVE': 'Licença Maternidade',
    };
    return map[type] ?? type;
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (status) {
      case 'CONFIRMED':
        color = AppColors.success;
        label = 'Confirmado';
        break;
      case 'PENDING':
        color = AppColors.warning;
        label = 'Pendente';
        break;
      case 'COMPLETED':
        color = AppColors.textTertiary;
        label = 'Concluído';
        break;
      case 'SCHEDULED':
        color = AppColors.primary;
        label = 'Agendado';
        break;
      default:
        color = AppColors.textTertiary;
        label = status;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
    );
  }
}

// ─── Connections Section ─────────────────────────────────────────────────────

class _ConnectionsSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Rede & Conexões', style: AppTextStyles.titleLarge),
              TextButton(
                onPressed: () => context.go('/connections'),
                child: const Text('Ver tudo'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _quickAction(context, Icons.hub_outlined, 'Ver meu grafo', '/network', AppColors.primary),
          _quickAction(context, Icons.people_outline, 'Conexões', '/connections', AppColors.secondary),
          _quickAction(context, Icons.explore_outlined, 'Descobrir', '/discover', AppColors.accent),
        ],
      ),
    );
  }

  Widget _quickAction(BuildContext context, IconData icon, String label, String path, Color color) {
    return GestureDetector(
      onTap: () => context.go(path),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 10),
          Text(label, style: AppTextStyles.labelLarge),
          const Spacer(),
          Icon(Icons.chevron_right, size: 18, color: AppColors.textTertiary),
        ]),
      ),
    );
  }
}

// ─── Jobs Section ────────────────────────────────────────────────────────────

class _JobsSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Oportunidades', style: AppTextStyles.titleLarge),
              TextButton(
                onPressed: () => context.go('/jobs'),
                child: const Text('Ver vagas'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _quickAction(context, Icons.work_outline, 'Vagas disponíveis', '/jobs', AppColors.primary),
          _quickAction(context, Icons.local_hospital_outlined, 'Plantões urgentes', '/jobs', AppColors.error),
          _quickAction(context, Icons.search, 'Busca inteligente', '/search', AppColors.secondary),
        ],
      ),
    );
  }

  Widget _quickAction(BuildContext context, IconData icon, String label, String path, Color color) {
    return GestureDetector(
      onTap: () => context.go(path),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 10),
          Text(label, style: AppTextStyles.labelLarge),
          const Spacer(),
          Icon(Icons.chevron_right, size: 18, color: AppColors.textTertiary),
        ]),
      ),
    );
  }
}

// ─── Error Card ──────────────────────────────────────────────────────────────

class _ErrorCard extends StatelessWidget {
  final String error;

  const _ErrorCard({required this.error});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.errorLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: Row(children: [
        Icon(Icons.error_outline, color: AppColors.error),
        const SizedBox(width: 10),
        Expanded(
          child: Text('Erro ao carregar agenda. Puxe para atualizar.',
              style: TextStyle(color: AppColors.error)),
        ),
      ]),
    );
  }
}
