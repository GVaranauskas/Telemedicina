import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../../core/models/appointment_model.dart';

/// A beautiful animated graph visualization showing doctors as nodes
/// connected to the patient (center node) with proximity-based distances.
class DoctorGraphView extends StatefulWidget {
  final List<DoctorMatchResult> doctors;
  final int? selectedIndex;
  final ValueChanged<int>? onDoctorTap;

  const DoctorGraphView({
    super.key,
    required this.doctors,
    this.selectedIndex,
    this.onDoctorTap,
  });

  @override
  State<DoctorGraphView> createState() => _DoctorGraphViewState();
}

class _DoctorGraphViewState extends State<DoctorGraphView>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _entryController;
  late AnimationController _floatController;
  late Animation<double> _pulseAnim;
  late Animation<double> _entryAnim;
  late Animation<double> _floatAnim;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..forward();
    _entryAnim = CurvedAnimation(
      parent: _entryController,
      curve: Curves.elasticOut,
    );

    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat(reverse: true);
    _floatAnim = Tween<double>(begin: -3.0, end: 3.0).animate(
      CurvedAnimation(parent: _floatController, curve: Curves.easeInOut),
    );
  }

  @override
  void didUpdateWidget(covariant DoctorGraphView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.doctors.length != widget.doctors.length) {
      _entryController.reset();
      _entryController.forward();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _entryController.dispose();
    _floatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_pulseAnim, _entryAnim, _floatAnim]),
      builder: (context, child) {
        return CustomPaint(
          painter: _GraphBackgroundPainter(
            pulseValue: _pulseAnim.value,
            entryValue: _entryAnim.value,
          ),
          child: _buildNodes(),
        );
      },
    );
  }

  Widget _buildNodes() {
    if (widget.doctors.isEmpty) {
      return const SizedBox.expand();
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final centerX = constraints.maxWidth / 2;
        final centerY = constraints.maxHeight / 2;
        final maxRadius = min(centerX, centerY) - 40;

        return Stack(
          children: [
            // Connection lines
            CustomPaint(
              size: Size(constraints.maxWidth, constraints.maxHeight),
              painter: _ConnectionLinePainter(
                centerX: centerX,
                centerY: centerY,
                doctors: widget.doctors,
                maxRadius: maxRadius,
                entryValue: _entryAnim.value,
                selectedIndex: widget.selectedIndex,
                floatValue: _floatAnim.value,
              ),
            ),

            // Center node (patient/you)
            _buildCenterNode(centerX, centerY),

            // Doctor nodes
            ...widget.doctors.asMap().entries.map((entry) {
              final index = entry.key;
              final doctor = entry.value;
              final pos = _getNodePosition(
                index,
                widget.doctors.length,
                centerX,
                centerY,
                maxRadius,
                doctor.distanceKm,
              );

              return _buildDoctorNode(doctor, index, pos, centerX, centerY);
            }),
          ],
        );
      },
    );
  }

  Widget _buildCenterNode(double cx, double cy) {
    return Positioned(
      left: cx - 28,
      top: cy - 28 + _floatAnim.value,
      child: AnimatedScale(
        scale: _entryAnim.value,
        duration: Duration.zero,
        child: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF667EEA).withOpacity(0.4 * _pulseAnim.value),
                blurRadius: 20 * _pulseAnim.value,
                spreadRadius: 4 * _pulseAnim.value,
              ),
            ],
          ),
          child: const Icon(Icons.person, color: Colors.white, size: 28),
        ),
      ),
    );
  }

  Widget _buildDoctorNode(
    DoctorMatchResult doctor,
    int index,
    Offset pos,
    double cx,
    double cy,
  ) {
    final isSelected = widget.selectedIndex == index;
    final nodeSize = isSelected ? 52.0 : 42.0;
    final delay = index * 0.1;
    final adjustedEntry = (_entryAnim.value - delay).clamp(0.0, 1.0);

    // Float offset varies per node
    final floatOffset = _floatAnim.value * (index.isEven ? 1 : -1);

    return Positioned(
      left: pos.dx - nodeSize / 2,
      top: pos.dy - nodeSize / 2 + floatOffset,
      child: AnimatedScale(
        scale: adjustedEntry,
        duration: Duration.zero,
        child: GestureDetector(
          onTap: () => widget.onDoctorTap?.call(index),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic,
            width: nodeSize,
            height: nodeSize,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isSelected
                    ? [const Color(0xFF00C9FF), const Color(0xFF92FE9D)]
                    : [
                        _getNodeColor(index).withOpacity(0.9),
                        _getNodeColor(index),
                      ],
              ),
              border: isSelected
                  ? Border.all(color: Colors.white, width: 3)
                  : null,
              boxShadow: [
                BoxShadow(
                  color: (isSelected
                          ? const Color(0xFF00C9FF)
                          : _getNodeColor(index))
                      .withOpacity(isSelected ? 0.5 : 0.3),
                  blurRadius: isSelected ? 16 : 8,
                  spreadRadius: isSelected ? 2 : 0,
                ),
              ],
            ),
            child: Center(
              child: Text(
                doctor.doctor.fullName.isNotEmpty
                    ? doctor.doctor.fullName[0].toUpperCase()
                    : '?',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: isSelected ? 20 : 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Offset _getNodePosition(
    int index,
    int total,
    double cx,
    double cy,
    double maxRadius,
    double distanceKm,
  ) {
    // Distribute nodes in a circle, closer doctors = closer to center
    final angle = (2 * pi * index / total) - pi / 2;
    // Normalize distance: min 0.3, max 0.9 of maxRadius
    final maxDist = widget.doctors
        .map((d) => d.distanceKm)
        .reduce((a, b) => a > b ? a : b);
    final normalizedDist =
        0.3 + (distanceKm / (maxDist > 0 ? maxDist : 1)) * 0.6;
    final radius = maxRadius * normalizedDist;

    return Offset(
      cx + radius * cos(angle),
      cy + radius * sin(angle),
    );
  }

  Color _getNodeColor(int index) {
    const colors = [
      Color(0xFF6366F1), // Indigo
      Color(0xFF8B5CF6), // Violet
      Color(0xFFEC4899), // Pink
      Color(0xFF14B8A6), // Teal
      Color(0xFFF59E0B), // Amber
      Color(0xFF3B82F6), // Blue
      Color(0xFF10B981), // Emerald
      Color(0xFFEF4444), // Red
      Color(0xFF06B6D4), // Cyan
      Color(0xFFA855F7), // Purple
    ];
    return colors[index % colors.length];
  }
}

class _GraphBackgroundPainter extends CustomPainter {
  final double pulseValue;
  final double entryValue;

  _GraphBackgroundPainter({
    required this.pulseValue,
    required this.entryValue,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Draw concentric radar-like circles
    for (int i = 1; i <= 3; i++) {
      final radius = (size.width / 6) * i * entryValue;
      final paint = Paint()
        ..color = Colors.white.withOpacity(0.06 + (i == 1 ? 0.02 * pulseValue : 0))
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1;
      canvas.drawCircle(Offset(cx, cy), radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GraphBackgroundPainter oldDelegate) {
    return oldDelegate.pulseValue != pulseValue ||
        oldDelegate.entryValue != entryValue;
  }
}

class _ConnectionLinePainter extends CustomPainter {
  final double centerX;
  final double centerY;
  final List<DoctorMatchResult> doctors;
  final double maxRadius;
  final double entryValue;
  final int? selectedIndex;
  final double floatValue;

  _ConnectionLinePainter({
    required this.centerX,
    required this.centerY,
    required this.doctors,
    required this.maxRadius,
    required this.entryValue,
    required this.selectedIndex,
    required this.floatValue,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (doctors.isEmpty) return;

    final maxDist = doctors
        .map((d) => d.distanceKm)
        .reduce((a, b) => a > b ? a : b);

    for (int i = 0; i < doctors.length; i++) {
      final angle = (2 * pi * i / doctors.length) - pi / 2;
      final normalizedDist =
          0.3 + (doctors[i].distanceKm / (maxDist > 0 ? maxDist : 1)) * 0.6;
      final radius = maxRadius * normalizedDist;
      final floatOffset = floatValue * (i.isEven ? 1 : -1);

      final endX = centerX + radius * cos(angle);
      final endY = centerY + radius * sin(angle) + floatOffset;

      final isSelected = selectedIndex == i;
      final opacity = isSelected ? 0.6 : 0.15;
      final width = isSelected ? 2.0 : 1.0;

      final paint = Paint()
        ..shader = LinearGradient(
          colors: [
            const Color(0xFF667EEA).withOpacity(opacity * entryValue),
            (isSelected ? const Color(0xFF00C9FF) : Colors.white)
                .withOpacity(opacity * 0.5 * entryValue),
          ],
        ).createShader(Rect.fromPoints(
          Offset(centerX, centerY + floatValue),
          Offset(endX, endY),
        ))
        ..strokeWidth = width
        ..style = PaintingStyle.stroke;

      // Animate line length
      final animEndX =
          centerX + (endX - centerX) * entryValue;
      final animEndY =
          (centerY + floatValue) + (endY - (centerY + floatValue)) * entryValue;

      canvas.drawLine(
        Offset(centerX, centerY + floatValue),
        Offset(animEndX, animEndY),
        paint,
      );

      // Draw small dots along line for selected
      if (isSelected) {
        for (double t = 0.3; t < 1.0; t += 0.2) {
          final dotX = centerX + (endX - centerX) * t * entryValue;
          final dotY = (centerY + floatValue) +
              (endY - (centerY + floatValue)) * t * entryValue;
          canvas.drawCircle(
            Offset(dotX, dotY),
            2,
            Paint()..color = const Color(0xFF00C9FF).withOpacity(0.5),
          );
        }
      }
    }

    // Draw lines between doctors that share specialties
    for (int i = 0; i < doctors.length; i++) {
      for (int j = i + 1; j < doctors.length; j++) {
        final shared = doctors[i]
            .doctor
            .specialties
            .where((s) => doctors[j].doctor.specialties.contains(s));
        if (shared.isNotEmpty) {
          final angle1 = (2 * pi * i / doctors.length) - pi / 2;
          final angle2 = (2 * pi * j / doctors.length) - pi / 2;
          final nd1 =
              0.3 + (doctors[i].distanceKm / (maxDist > 0 ? maxDist : 1)) * 0.6;
          final nd2 =
              0.3 + (doctors[j].distanceKm / (maxDist > 0 ? maxDist : 1)) * 0.6;
          final r1 = maxRadius * nd1;
          final r2 = maxRadius * nd2;

          final x1 = centerX + r1 * cos(angle1);
          final y1 = centerY + r1 * sin(angle1) + floatValue * (i.isEven ? 1 : -1);
          final x2 = centerX + r2 * cos(angle2);
          final y2 = centerY + r2 * sin(angle2) + floatValue * (j.isEven ? 1 : -1);

          final paint = Paint()
            ..color = Colors.white.withOpacity(0.05 * entryValue)
            ..strokeWidth = 0.5
            ..style = PaintingStyle.stroke;

          canvas.drawLine(Offset(x1, y1), Offset(x2, y2), paint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _ConnectionLinePainter oldDelegate) => true;
}
