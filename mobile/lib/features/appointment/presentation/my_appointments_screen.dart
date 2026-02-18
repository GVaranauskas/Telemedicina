import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../../core/models/appointment_model.dart';
import '../../../core/providers/api_provider.dart';
import '../../../core/repositories/patient_repository.dart';

final _patientRepoProvider = Provider<PatientRepository>(
  (ref) => PatientRepository(ref.watch(apiClientProvider)),
);

final _appointmentsProvider =
    FutureProvider.autoDispose<List<AppointmentModel>>((ref) async {
  final repo = ref.watch(_patientRepoProvider);
  return repo.getMyAppointments(upcoming: true);
});

class MyAppointmentsScreen extends ConsumerWidget {
  final bool embedded;

  const MyAppointmentsScreen({super.key, this.embedded = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appointmentsAsync = ref.watch(_appointmentsProvider);

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0A0E21),
            Color(0xFF1A1A3E),
            Color(0xFF0D1B2A),
          ],
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          automaticallyImplyLeading: !embedded,
          iconTheme: const IconThemeData(color: Colors.white),
          title: const Text(
            'Minhas Consultas',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 20,
            ),
          ),
          centerTitle: true,
          actions: [
            IconButton(
              icon: Icon(Icons.refresh_rounded,
                  color: Colors.white.withOpacity(0.6)),
              onPressed: () => ref.invalidate(_appointmentsProvider),
            ),
          ],
        ),
        body: SafeArea(
          child: appointmentsAsync.when(
            loading: () => Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 40,
                    height: 40,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation(
                          Colors.white.withOpacity(0.6)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Carregando consultas...',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            error: (e, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.cloud_off_rounded,
                        size: 48, color: Colors.white.withOpacity(0.25)),
                    const SizedBox(height: 16),
                    Text(
                      'Erro ao carregar consultas',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextButton.icon(
                      onPressed: () => ref.invalidate(_appointmentsProvider),
                      icon: const Icon(Icons.refresh_rounded,
                          color: Color(0xFF00C9FF), size: 18),
                      label: const Text(
                        'Tentar novamente',
                        style: TextStyle(color: Color(0xFF00C9FF)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            data: (appointments) {
              if (appointments.isEmpty) {
                return _buildEmptyState(context);
              }

              return ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                itemCount: appointments.length,
                itemBuilder: (context, index) {
                  return _AppointmentCard(appointment: appointments[index])
                      .animate()
                      .fadeIn(
                          delay: (80 * index).ms, duration: 400.ms)
                      .slideX(begin: 0.05);
                },
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: const Color(0xFF667EEA).withOpacity(0.3),
                  width: 2,
                ),
              ),
              child: Container(
                margin: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: const Color(0xFF667EEA).withOpacity(0.5),
                    width: 2,
                  ),
                ),
                child: const Icon(
                  Icons.calendar_today_rounded,
                  size: 28,
                  color: Color(0xFF667EEA),
                ),
              ),
            )
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .scale(
                  begin: const Offset(0.95, 0.95),
                  end: const Offset(1.05, 1.05),
                  duration: 2000.ms,
                ),
            const SizedBox(height: 28),
            const Text(
              'Nenhuma consulta\nagendada',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w700,
                height: 1.3,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'Busque medicos proximos e\nagende sua primeira consulta.',
              style: TextStyle(
                color: Colors.white.withOpacity(0.4),
                fontSize: 14,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.1);
  }
}

class _AppointmentCard extends StatelessWidget {
  final AppointmentModel appointment;

  const _AppointmentCard({required this.appointment});

  Color get _statusColor {
    switch (appointment.status) {
      case 'CONFIRMED':
        return const Color(0xFF10B981);
      case 'PENDING':
        return const Color(0xFFF59E0B);
      case 'COMPLETED':
        return const Color(0xFF667EEA);
      case 'CANCELLED_BY_PATIENT':
      case 'CANCELLED_BY_DOCTOR':
        return const Color(0xFFEF4444);
      default:
        return Colors.white.withOpacity(0.4);
    }
  }

  IconData get _statusIcon {
    switch (appointment.status) {
      case 'CONFIRMED':
        return Icons.check_circle_outline_rounded;
      case 'PENDING':
        return Icons.schedule_rounded;
      case 'COMPLETED':
        return Icons.task_alt_rounded;
      case 'CANCELLED_BY_PATIENT':
      case 'CANCELLED_BY_DOCTOR':
        return Icons.cancel_outlined;
      default:
        return Icons.info_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy', 'pt_BR');
    final timeFormat = DateFormat('HH:mm');

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.06),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Doctor + Status
              Row(
                children: [
                  // Doctor avatar
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          const Color(0xFF6366F1).withOpacity(0.8),
                          const Color(0xFF8B5CF6),
                        ],
                      ),
                    ),
                    child: Center(
                      child: Text(
                        (appointment.doctor?.fullName ?? 'M')
                            .substring(0, 1)
                            .toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          appointment.doctor?.fullName ?? 'Medico',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        if (appointment.doctor?.specialties.isNotEmpty ==
                            true)
                          Text(
                            appointment.doctor!.specialties.first,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF00C9FF),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                      ],
                    ),
                  ),
                  // Status badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      color: _statusColor.withOpacity(0.12),
                      border: Border.all(
                          color: _statusColor.withOpacity(0.2)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(_statusIcon, size: 13, color: _statusColor),
                        const SizedBox(width: 4),
                        Text(
                          appointment.statusDisplay,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _statusColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Gradient divider
              Container(
                height: 1,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.white.withOpacity(0),
                      Colors.white.withOpacity(0.07),
                      Colors.white.withOpacity(0),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 14),

              // Date, Time, Type row
              Row(
                children: [
                  _buildInfoChip(
                    Icons.calendar_today_rounded,
                    dateFormat.format(appointment.scheduledAt),
                  ),
                  const SizedBox(width: 10),
                  _buildInfoChip(
                    Icons.access_time_rounded,
                    timeFormat.format(appointment.scheduledAt),
                  ),
                  const SizedBox(width: 10),
                  _buildInfoChip(
                    appointment.type == 'TELEMEDICINA'
                        ? Icons.videocam_rounded
                        : Icons.location_on_rounded,
                    appointment.typeDisplay,
                  ),
                ],
              ),

              // Workplace
              if (appointment.workplace != null) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(Icons.business_rounded,
                        size: 14, color: Colors.white.withOpacity(0.3)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${appointment.workplace!.name} - ${appointment.workplace!.shortAddress}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withOpacity(0.4),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: Colors.white.withOpacity(0.06),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: Colors.white.withOpacity(0.4)),
          const SizedBox(width: 5),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withOpacity(0.7),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
