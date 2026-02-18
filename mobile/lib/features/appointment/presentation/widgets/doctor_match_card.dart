import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
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

  void _showBookingSheet() {
    if (_selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Selecione um horario'),
          backgroundColor: Colors.white.withOpacity(0.1),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    final reasonController = TextEditingController();
    final match = widget.match;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
          child: Container(
            padding: EdgeInsets.fromLTRB(
                24, 24, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A3E).withOpacity(0.95),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(28)),
              border: Border(
                top: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(2),
                    color: Colors.white.withOpacity(0.2),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Confirmar Agendamento',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.95),
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 20),

                // Info rows
                _buildInfoRow(Icons.person_rounded, match.doctor.fullName),
                if (match.doctor.specialties.isNotEmpty)
                  _buildInfoRow(Icons.medical_services_rounded,
                      match.doctor.specialties.first),
                _buildInfoRow(
                    Icons.location_on_rounded, match.workplace.shortAddress),
                _buildInfoRow(Icons.calendar_today_rounded,
                    widget.selectedDate ?? 'A definir'),
                _buildInfoRow(Icons.access_time_rounded, _selectedSlot!),

                const SizedBox(height: 20),

                // Reason field
                TextField(
                  controller: reasonController,
                  style: TextStyle(color: Colors.white.withOpacity(0.9)),
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: 'Motivo da consulta (opcional)',
                    labelStyle:
                        TextStyle(color: Colors.white.withOpacity(0.4)),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.06),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          BorderSide(color: Colors.white.withOpacity(0.1)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          BorderSide(color: Colors.white.withOpacity(0.1)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(
                          color: Color(0xFF667EEA), width: 2),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white.withOpacity(0.7),
                          side: BorderSide(
                              color: Colors.white.withOpacity(0.15)),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text('Cancelar'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _bookAppointment(reasonController.text);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF667EEA),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        child: const Text(
                          'Confirmar',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF00C9FF).withOpacity(0.7)),
          const SizedBox(width: 12),
          Text(
            text,
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 14,
            ),
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
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded,
                    color: Color(0xFF92FE9D), size: 20),
                SizedBox(width: 10),
                Text('Consulta agendada com sucesso!',
                    style: TextStyle(color: Colors.white)),
              ],
            ),
            backgroundColor: const Color(0xFF1A1A3E),
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        );
      } else {
        final error = ref.read(appointmentProvider).error;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? 'Erro ao agendar',
                style: const TextStyle(color: Colors.white)),
            backgroundColor: const Color(0xFFEF4444).withOpacity(0.9),
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final match = widget.match;

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.07),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Doctor header
              Row(
                children: [
                  // Avatar with gradient
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: match.doctor.profilePicUrl != null
                            ? [
                                const Color(0xFF667EEA),
                                const Color(0xFF764BA2),
                              ]
                            : [
                                const Color(0xFF6366F1).withOpacity(0.8),
                                const Color(0xFF8B5CF6),
                              ],
                      ),
                      image: match.doctor.profilePicUrl != null
                          ? DecorationImage(
                              image:
                                  NetworkImage(match.doctor.profilePicUrl!),
                              fit: BoxFit.cover,
                            )
                          : null,
                    ),
                    child: match.doctor.profilePicUrl == null
                        ? Center(
                            child: Text(
                              match.doctor.fullName.isNotEmpty
                                  ? match.doctor.fullName[0].toUpperCase()
                                  : '?',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          match.doctor.fullName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 3),
                        if (match.doctor.crm != null)
                          Text(
                            match.doctor.crmFormatted,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.white.withOpacity(0.4),
                            ),
                          ),
                        if (match.doctor.specialties.isNotEmpty)
                          Text(
                            match.doctor.specialties.join(', '),
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF00C9FF),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                      ],
                    ),
                  ),
                  // Distance badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: const Color(0xFF00C9FF).withOpacity(0.12),
                      border: Border.all(
                          color: const Color(0xFF00C9FF).withOpacity(0.2)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.near_me_rounded,
                            size: 13, color: Color(0xFF00C9FF)),
                        const SizedBox(width: 4),
                        Text(
                          '${match.distanceKm} km',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF00C9FF),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Divider
              Container(
                height: 1,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.white.withOpacity(0),
                      Colors.white.withOpacity(0.08),
                      Colors.white.withOpacity(0),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 14),

              // Workplace
              Row(
                children: [
                  Icon(Icons.location_on_rounded,
                      size: 15, color: Colors.white.withOpacity(0.35)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${match.workplace.name} - ${match.workplace.shortAddress}',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withOpacity(0.5),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Slots label
              Text(
                'Horarios disponiveis',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.white.withOpacity(0.5),
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 10),

              // Time slots
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: match.availableSlots.map((slot) {
                  final isSelected = _selectedSlot == slot;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedSlot = slot),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 9),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: isSelected
                            ? const LinearGradient(
                                colors: [
                                  Color(0xFF667EEA),
                                  Color(0xFF764BA2),
                                ],
                              )
                            : null,
                        color: isSelected
                            ? null
                            : Colors.white.withOpacity(0.06),
                        border: Border.all(
                          color: isSelected
                              ? Colors.transparent
                              : Colors.white.withOpacity(0.12),
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: const Color(0xFF667EEA)
                                      .withOpacity(0.3),
                                  blurRadius: 8,
                                  spreadRadius: 0,
                                ),
                              ]
                            : null,
                      ),
                      child: Text(
                        slot,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight:
                              isSelected ? FontWeight.w600 : FontWeight.w500,
                          color: isSelected
                              ? Colors.white
                              : Colors.white.withOpacity(0.7),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              // Book button
              if (_selectedSlot != null && widget.selectedDate != null) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _showBookingSheet,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF667EEA),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.calendar_month_rounded, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Agendar Consulta',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  )
                      .animate()
                      .fadeIn(duration: 200.ms)
                      .slideY(begin: 0.1),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
