import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/appointment_provider.dart';
import '../../../core/models/appointment_model.dart';
import '../../../core/models/doctor_model.dart';
import '../../../core/providers/api_provider.dart';
import '../../../core/repositories/doctor_repository.dart';
import 'widgets/doctor_graph_view.dart';
import 'widgets/doctor_match_card.dart';

class DoctorSearchScreen extends ConsumerStatefulWidget {
  final bool embedded;

  const DoctorSearchScreen({super.key, this.embedded = false});

  @override
  ConsumerState<DoctorSearchScreen> createState() =>
      _DoctorSearchScreenState();
}

class _DoctorSearchScreenState extends ConsumerState<DoctorSearchScreen>
    with SingleTickerProviderStateMixin {
  final _dateController = TextEditingController();
  String? _selectedSpecialtyId;
  String _selectedTime = '10:00';
  double _radiusKm = 10;
  int? _selectedDoctorIndex;
  bool _showList = false;

  double _latitude = -23.5505;
  double _longitude = -46.6333;

  List<Specialty> _specialties = [];
  bool _loadingSpecialties = true;

  final _timeOptions = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00',
  ];

  @override
  void initState() {
    super.initState();
    _loadSpecialties();
  }

  Future<void> _loadSpecialties() async {
    try {
      final repo = DoctorRepository(ref.read(apiClientProvider));
      final specialties = await repo.getAllSpecialties();
      setState(() {
        _specialties = specialties;
        _loadingSpecialties = false;
      });
    } catch (_) {
      setState(() => _loadingSpecialties = false);
    }
  }

  @override
  void dispose() {
    _dateController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) {
      setState(() {
        _dateController.text =
            '${picked.day.toString().padLeft(2, '0')}/${picked.month.toString().padLeft(2, '0')}/${picked.year}';
      });
    }
  }

  String? _dateToIso() {
    if (_dateController.text.isEmpty) return null;
    final parts = _dateController.text.split('/');
    if (parts.length != 3) return null;
    return '${parts[2]}-${parts[1]}-${parts[0]}';
  }

  void _search() {
    setState(() {
      _selectedDoctorIndex = null;
      _showList = false;
    });
    ref.read(doctorSearchProvider.notifier).searchNearby(
          latitude: _latitude,
          longitude: _longitude,
          radiusKm: _radiusKm,
          specialtyId: _selectedSpecialtyId,
          date: _dateToIso(),
          preferredTime: _selectedTime,
        );
  }

  @override
  Widget build(BuildContext context) {
    final searchState = ref.watch(doctorSearchProvider);
    final hasResults = searchState.results.isNotEmpty;

    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: const Color(0xFF0A0E21),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: !widget.embedded,
        title: const Text(
          'Encontrar Medico',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          if (hasResults)
            IconButton(
              icon: Icon(
                _showList ? Icons.bubble_chart : Icons.list_rounded,
                color: Colors.white,
              ),
              onPressed: () => setState(() => _showList = !_showList),
              tooltip: _showList ? 'Ver grafo' : 'Ver lista',
            ),
        ],
      ),
      body: Stack(
        children: [
          // Background gradient
          Container(
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
          ),

          // Subtle background particles
          ...List.generate(6, (i) {
            final positions = [
              [0.1, 0.2], [0.8, 0.15], [0.3, 0.6],
              [0.7, 0.5], [0.15, 0.8], [0.85, 0.75],
            ];
            return Positioned(
              left: MediaQuery.of(context).size.width * positions[i][0],
              top: MediaQuery.of(context).size.height * positions[i][1],
              child: Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.15),
                ),
              ),
            );
          }),

          // Main content
          SafeArea(
            child: Column(
              children: [
                const SizedBox(height: 8),
                // Graph or List view
                Expanded(
                  child: _buildMainContent(searchState),
                ),

                // Selected doctor detail (if any)
                if (hasResults &&
                    _selectedDoctorIndex != null &&
                    !_showList)
                  _buildSelectedDoctorPanel(
                      searchState.results[_selectedDoctorIndex!]),

                // Bottom filter panel
                _buildFilterPanel(searchState),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainContent(DoctorSearchState state) {
    if (state.isLoading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor:
                    AlwaysStoppedAnimation(Colors.white.withOpacity(0.8)),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Buscando medicos proximos...',
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 14,
              ),
            ),
          ],
        ).animate().fadeIn(duration: 300.ms),
      );
    }

    if (state.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cloud_off_rounded,
                  size: 48, color: Colors.white.withOpacity(0.3)),
              const SizedBox(height: 16),
              Text(
                state.error!,
                style: TextStyle(color: Colors.white.withOpacity(0.7)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: _search,
                child: const Text('Tentar novamente',
                    style: TextStyle(color: Color(0xFF00C9FF))),
              ),
            ],
          ),
        ),
      );
    }

    if (state.results.isEmpty) {
      return _buildEmptyState();
    }

    if (_showList) {
      return _buildListView(state);
    }

    return _buildGraphView(state);
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Animated radar icon
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: const Color(0xFF667EEA).withOpacity(0.3),
                  width: 2,
                ),
              ),
              child: Container(
                margin: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: const Color(0xFF667EEA).withOpacity(0.5),
                    width: 2,
                  ),
                ),
                child: const Icon(
                  Icons.radar_rounded,
                  size: 36,
                  color: Color(0xFF667EEA),
                ),
              ),
            )
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .scale(
                  begin: const Offset(0.95, 0.95),
                  end: const Offset(1.05, 1.05),
                  duration: 2000.ms,
                )
                .then()
                .fadeIn(),
            const SizedBox(height: 32),
            const Text(
              'Encontre medicos\nperto de voce',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                height: 1.3,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'Selecione especialidade, data e horario.\nVamos conectar voce ao medico ideal.',
              style: TextStyle(
                color: Colors.white.withOpacity(0.5),
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

  Widget _buildGraphView(DoctorSearchState state) {
    return Column(
      children: [
        // Graph header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFF00C9FF),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${state.results.length} medicos encontrados',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.7),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Text(
                'Raio: ${_radiusKm.round()} km',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ).animate().fadeIn(delay: 200.ms),
        const SizedBox(height: 8),

        // The graph
        Expanded(
          child: DoctorGraphView(
            doctors: state.results.take(12).toList(), // max 12 nodes
            selectedIndex: _selectedDoctorIndex,
            onDoctorTap: (index) {
              setState(() => _selectedDoctorIndex = index);
            },
          ),
        ),

        // Legend
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildLegendItem(
                  const Color(0xFF667EEA), 'Voce'),
              const SizedBox(width: 20),
              _buildLegendItem(
                  const Color(0xFF6366F1), 'Medico'),
              const SizedBox(width: 20),
              _buildLegendItem(
                  const Color(0xFF00C9FF), 'Selecionado'),
            ],
          ),
        ).animate().fadeIn(delay: 500.ms),
      ],
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color,
            boxShadow: [
              BoxShadow(color: color.withOpacity(0.4), blurRadius: 4),
            ],
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.5),
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  Widget _buildListView(DoctorSearchState state) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      itemCount: state.results.length,
      itemBuilder: (context, index) {
        return DoctorMatchCard(
          match: state.results[index],
          selectedDate: _dateToIso(),
        )
            .animate()
            .fadeIn(delay: (100 * index).ms, duration: 400.ms)
            .slideX(begin: 0.1);
      },
    );
  }

  Widget _buildSelectedDoctorPanel(DoctorMatchResult match) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.08),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Colors.white.withOpacity(0.12),
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    // Doctor avatar
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [Color(0xFF00C9FF), Color(0xFF92FE9D)],
                        ),
                      ),
                      child: Center(
                        child: Text(
                          match.doctor.fullName.isNotEmpty
                              ? match.doctor.fullName[0]
                              : '?',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
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
                            match.doctor.fullName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            match.doctor.specialties.isNotEmpty
                                ? match.doctor.specialties.first
                                : match.doctor.crmFormatted,
                            style: TextStyle(
                              color: const Color(0xFF00C9FF).withOpacity(0.9),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Distance
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: const Color(0xFF00C9FF).withOpacity(0.15),
                      ),
                      child: Text(
                        '${match.distanceKm} km',
                        style: const TextStyle(
                          color: Color(0xFF00C9FF),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Workplace
                Row(
                  children: [
                    Icon(Icons.location_on_rounded,
                        size: 14, color: Colors.white.withOpacity(0.4)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '${match.workplace.name} - ${match.workplace.shortAddress}',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.5),
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Time slots
                SizedBox(
                  height: 36,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: match.availableSlots.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, i) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          color: Colors.white.withOpacity(0.1),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.15),
                          ),
                        ),
                        child: Center(
                          child: Text(
                            match.availableSlots[i],
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() => _showList = true);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00C9FF),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Ver detalhes e agendar',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.2);
  }

  Widget _buildFilterPanel(DoctorSearchState searchState) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.07),
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(
              top: BorderSide(
                color: Colors.white.withOpacity(0.1),
              ),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  color: Colors.white.withOpacity(0.2),
                ),
              ),
              const SizedBox(height: 16),

              // Specialty chips
              SizedBox(
                height: 38,
                child: _loadingSpecialties
                    ? Center(
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white.withOpacity(0.3),
                          ),
                        ),
                      )
                    : ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          _buildChip('Todas', null),
                          ..._specialties.map(
                              (s) => _buildChip(s.name, s.id)),
                        ],
                      ),
              ),
              const SizedBox(height: 12),

              // Date, Time, Radius row
              Row(
                children: [
                  // Date
                  Expanded(
                    child: GestureDetector(
                      onTap: _selectDate,
                      child: Container(
                        height: 44,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          color: Colors.white.withOpacity(0.08),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.1),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.calendar_today_rounded,
                                size: 16,
                                color: Colors.white.withOpacity(0.5)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _dateController.text.isEmpty
                                    ? 'Data'
                                    : _dateController.text,
                                style: TextStyle(
                                  color: Colors.white.withOpacity(
                                      _dateController.text.isEmpty
                                          ? 0.4
                                          : 0.9),
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Time picker
                  Container(
                    height: 44,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: Colors.white.withOpacity(0.08),
                      border: Border.all(
                        color: Colors.white.withOpacity(0.1),
                      ),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedTime,
                        dropdownColor: const Color(0xFF1A1A3E),
                        icon: Icon(Icons.expand_more,
                            size: 18,
                            color: Colors.white.withOpacity(0.5)),
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 13,
                        ),
                        items: _timeOptions
                            .map((t) => DropdownMenuItem(
                                value: t, child: Text(t)))
                            .toList(),
                        onChanged: (v) =>
                            setState(() => _selectedTime = v ?? '10:00'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Radius
                  GestureDetector(
                    onTap: _showRadiusSheet,
                    child: Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: Colors.white.withOpacity(0.08),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.1),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.radar_rounded,
                              size: 16,
                              color: Colors.white.withOpacity(0.5)),
                          const SizedBox(width: 6),
                          Text(
                            '${_radiusKm.round()} km',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Search button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: searchState.isLoading ? null : _search,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF667EEA),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                    disabledBackgroundColor:
                        const Color(0xFF667EEA).withOpacity(0.5),
                  ),
                  child: searchState.isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.search_rounded, size: 20),
                            SizedBox(width: 8),
                            Text(
                              'Buscar Medicos',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChip(String label, String? specialtyId) {
    final isActive = _selectedSpecialtyId == specialtyId;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => setState(() => _selectedSpecialtyId = specialtyId),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: isActive
                ? const Color(0xFF667EEA)
                : Colors.white.withOpacity(0.08),
            border: Border.all(
              color: isActive
                  ? const Color(0xFF667EEA)
                  : Colors.white.withOpacity(0.12),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isActive
                  ? Colors.white
                  : Colors.white.withOpacity(0.7),
              fontSize: 13,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }

  void _showRadiusSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A3E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: const EdgeInsets.all(24),
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
                  const SizedBox(height: 20),
                  Text(
                    'Raio de busca',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.9),
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${_radiusKm.round()} km',
                    style: const TextStyle(
                      color: Color(0xFF00C9FF),
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      activeTrackColor: const Color(0xFF667EEA),
                      inactiveTrackColor: Colors.white.withOpacity(0.1),
                      thumbColor: const Color(0xFF00C9FF),
                      overlayColor:
                          const Color(0xFF00C9FF).withOpacity(0.1),
                    ),
                    child: Slider(
                      value: _radiusKm,
                      min: 1,
                      max: 50,
                      divisions: 49,
                      onChanged: (v) {
                        setSheetState(() => _radiusKm = v);
                        setState(() => _radiusKm = v);
                      },
                    ),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('1 km',
                          style: TextStyle(
                              color: Colors.white.withOpacity(0.4),
                              fontSize: 12)),
                      Text('50 km',
                          style: TextStyle(
                              color: Colors.white.withOpacity(0.4),
                              fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
