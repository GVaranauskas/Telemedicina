import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/appointment_provider.dart';
import '../../../core/models/appointment_model.dart';

class PatientHomeScreen extends ConsumerStatefulWidget {
  const PatientHomeScreen({super.key});

  @override
  ConsumerState<PatientHomeScreen> createState() => _PatientHomeScreenState();
}

class _PatientHomeScreenState extends ConsumerState<PatientHomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(appointmentProvider.notifier).loadAppointments());
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final apptState = ref.watch(appointmentProvider);
    final firstName = user?.fullName?.split(' ').first ?? 'Paciente';

    final upcoming = apptState.appointments
        .where((a) =>
            a.scheduledAt.isAfter(DateTime.now()) &&
            a.status != 'CANCELLED_BY_PATIENT' &&
            a.status != 'CANCELLED_BY_DOCTOR')
        .toList()
      ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));

    final past = apptState.appointments
        .where((a) => a.scheduledAt.isBefore(DateTime.now()) || a.status == 'COMPLETED')
        .toList()
      ..sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: () => ref.read(appointmentProvider.notifier).loadAppointments(),
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
                              Text('Olá, $firstName 👋', style: AppTextStyles.headingMedium),
                              const SizedBox(height: 4),
                              Text(
                                DateFormat("EEEE, d 'de' MMMM", 'pt_BR').format(DateTime.now()),
                                style: AppTextStyles.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.notifications_outlined),
                          onPressed: () => context.go('/notifications'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Book appointment CTA
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Agendar Consulta'),
                        onPressed: () => context.go('/doctor-search'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ─── Upcoming appointments ──────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Próximas Consultas', style: AppTextStyles.titleLarge),
                    TextButton(
                      onPressed: () => context.go('/appointments'),
                      child: const Text('Ver todas'),
                    ),
                  ],
                ),
              ),
            ),

            if (apptState.isLoading)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: CircularProgressIndicator()),
                ),
              )
            else if (upcoming.isEmpty)
              SliverToBoxAdapter(
                child: Container(
                  margin: const EdgeInsets.fromLTRB(20, 0, 20, 0),
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.calendar_today_outlined, size: 42, color: AppColors.textTertiary),
                      const SizedBox(height: 12),
                      Text('Nenhuma consulta agendada', style: AppTextStyles.titleMedium),
                      const SizedBox(height: 8),
                      Text('Encontre um médico e agende sua próxima consulta.',
                          textAlign: TextAlign.center, style: AppTextStyles.bodySmall),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: () => context.go('/doctor-search'),
                        child: const Text('Buscar médico'),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, i) => Padding(
                    padding: EdgeInsets.fromLTRB(20, i == 0 ? 0 : 6, 20, 6),
                    child: _AppointmentCard(appointment: upcoming[i]),
                  ),
                  childCount: upcoming.length.clamp(0, 3),
                ),
              ),

            // ─── Doctor search banner ────────────────────────────────────────
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Encontre o médico ideal',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                            )),
                        const SizedBox(height: 4),
                        Text('Busca por especialidade, localização e disponibilidade',
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12)),
                        const SizedBox(height: 12),
                        GestureDetector(
                          onTap: () => context.go('/doctor-search'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('Buscar médico',
                                style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.medical_services_rounded, color: Colors.white.withValues(alpha: 0.4), size: 56),
                ]),
              ),
            ),

            // ─── History ────────────────────────────────────────────────────
            if (past.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Text('Histórico de Consultas', style: AppTextStyles.titleLarge),
                ),
              ),
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, i) => Padding(
                    padding: EdgeInsets.fromLTRB(20, i == 0 ? 0 : 6, 20, 6),
                    child: _AppointmentCard(appointment: past[i], isPast: true),
                  ),
                  childCount: past.length.clamp(0, 5),
                ),
              ),
            ],

            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }
}

// ─── Appointment Card ────────────────────────────────────────────────────────

class _AppointmentCard extends StatelessWidget {
  final AppointmentModel appointment;
  final bool isPast;

  const _AppointmentCard({required this.appointment, this.isPast = false});

  @override
  Widget build(BuildContext context) {
    final doctorName = appointment.doctor?.fullName ?? 'Médico';
    final specialty = appointment.doctor?.specialties.isNotEmpty == true
        ? appointment.doctor!.specialties.first
        : null;
    final workplace = appointment.workplace?.name ?? '';

    Color statusColor;
    switch (appointment.status) {
      case 'CONFIRMED':
        statusColor = AppColors.success;
        break;
      case 'PENDING':
        statusColor = AppColors.warning;
        break;
      case 'COMPLETED':
        statusColor = AppColors.textTertiary;
        break;
      case 'CANCELLED_BY_PATIENT':
      case 'CANCELLED_BY_DOCTOR':
        statusColor = AppColors.error;
        break;
      default:
        statusColor = AppColors.textTertiary;
    }

    return Opacity(
      opacity: isPast ? 0.7 : 1.0,
      child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [
        Container(
          width: 48,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.primaryLight,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(
              DateFormat('d').format(appointment.scheduledAt),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            Text(
              DateFormat('MMM', 'pt_BR').format(appointment.scheduledAt),
              style: TextStyle(fontSize: 10, color: AppColors.primary),
            ),
          ]),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Dr. $doctorName', style: AppTextStyles.titleSmall),
              if (specialty != null) ...[
                const SizedBox(height: 2),
                Text(specialty, style: AppTextStyles.bodySmall),
              ],
              if (workplace.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(workplace, style: AppTextStyles.labelSmall),
              ],
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              DateFormat('HH:mm').format(appointment.scheduledAt),
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                _statusLabel(appointment.status),
                style: TextStyle(fontSize: 10, color: statusColor, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ]),
    ),   // Container
    );   // Opacity
  }

  String _statusLabel(String status) {
    const map = {
      'PENDING': 'Pendente',
      'CONFIRMED': 'Confirmado',
      'COMPLETED': 'Concluído',
      'CANCELLED_BY_PATIENT': 'Cancelado',
      'CANCELLED_BY_DOCTOR': 'Cancelado',
      'NO_SHOW': 'Faltou',
    };
    return map[status] ?? status;
  }
}
