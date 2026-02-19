import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/models/appointment_model.dart';
import '../../../../core/providers/appointment_provider.dart';

class DoctorMatchCard extends ConsumerStatefulWidget {
  final DoctorMatchResult match;
  final String? selectedDate;

  const DoctorMatchCard({
    super.key,
    required this.match,
    this.selectedDate,
  });

  @override
  ConsumerState<DoctorMatchCard> createState() => _DoctorMatchCardState();
}

class _DoctorMatchCardState extends ConsumerState<DoctorMatchCard> {
  String? _selectedSlot;

  void _showBookingDialog() {
    if (_selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione um horario')),
      );
      return;
    }

    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar Agendamento'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Medico: ${widget.match.doctor.fullName}'),
            if (widget.match.doctor.specialties.isNotEmpty)
              Text(
                  'Especialidade: ${widget.match.doctor.specialties.first}'),
            Text('Local: ${widget.match.workplace.shortAddress}'),
            Text('Data: ${widget.selectedDate ?? 'A definir'}'),
            Text('Horario: $_selectedSlot'),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Motivo da consulta (opcional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await _bookAppointment(reasonController.text);
            },
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );
  }

  Future<void> _bookAppointment(String reason) async {
    if (_selectedSlot == null || widget.selectedDate == null) return;

    final scheduledAt = '${widget.selectedDate}T$_selectedSlot:00Z';

    final appointment =
        await ref.read(appointmentProvider.notifier).bookAppointment(
              doctorId: widget.match.doctor.id,
              workplaceId: widget.match.workplace.id,
              scheduledAt: scheduledAt,
              reason: reason.isNotEmpty ? reason : null,
            );

    if (mounted) {
      if (appointment != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Consulta agendada com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        final error = ref.read(appointmentProvider).error;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? 'Erro ao agendar'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final match = widget.match;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Doctor info
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.primary.withOpacity(0.1),
                  backgroundImage: match.doctor.profilePicUrl != null
                      ? NetworkImage(match.doctor.profilePicUrl!)
                      : null,
                  child: match.doctor.profilePicUrl == null
                      ? Text(
                          match.doctor.fullName.isNotEmpty
                              ? match.doctor.fullName[0]
                              : '?',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        match.doctor.fullName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (match.doctor.crm != null)
                        Text(
                          match.doctor.crmFormatted,
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      if (match.doctor.specialties.isNotEmpty)
                        Text(
                          match.doctor.specialties.join(', '),
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                    ],
                  ),
                ),
                // Distance badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.location_on,
                          size: 14, color: AppColors.primary),
                      const SizedBox(width: 4),
                      Text(
                        '${match.distanceKm} km',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const Divider(height: 24),

            // Workplace info
            Row(
              children: [
                const Icon(Icons.business, size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${match.workplace.name} - ${match.workplace.shortAddress}',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Available time slots
            const Text(
              'Horarios disponiveis:',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: match.availableSlots.map((slot) {
                final isSelected = _selectedSlot == slot;
                return GestureDetector(
                  onTap: () => setState(() => _selectedSlot = slot),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary
                          : AppColors.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.primary.withOpacity(0.3),
                      ),
                    ),
                    child: Text(
                      slot,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? Colors.white : AppColors.primary,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            if (_selectedSlot != null && widget.selectedDate != null) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _showBookingDialog,
                  child: const Text('Agendar Consulta'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
