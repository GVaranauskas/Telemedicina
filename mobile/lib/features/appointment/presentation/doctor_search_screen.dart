import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/appointment_provider.dart';
import '../../../core/models/doctor_model.dart';
import '../../../core/providers/api_provider.dart';
import '../../../core/repositories/doctor_repository.dart';
import 'widgets/doctor_match_card.dart';

class DoctorSearchScreen extends ConsumerStatefulWidget {
  const DoctorSearchScreen({super.key});

  @override
  ConsumerState<DoctorSearchScreen> createState() => _DoctorSearchScreenState();
}

class _DoctorSearchScreenState extends ConsumerState<DoctorSearchScreen> {
  final _dateController = TextEditingController();
  String? _selectedSpecialtyId;
  String _selectedTime = '10:00';
  double _radiusKm = 10;

  // Default to São Paulo center for demo; in production, use geolocator
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
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 90)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: Theme.of(context).primaryColor,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && mounted) {
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
    try {
      final day = int.parse(parts[0]);
      final month = int.parse(parts[1]);
      final year = int.parse(parts[2]);
      // Validate date
      final date = DateTime(year, month, day);
      if (date.year != year || date.month != month || date.day != day) {
        return null;
      }
      return '${parts[2]}-${parts[1].padLeft(2, '0')}-${parts[0].padLeft(2, '0')}';
    } catch (e) {
      return null;
    }
  }

  void _search() {
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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Encontrar Medico'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // ─── Filters ────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: Border(
                bottom: BorderSide(color: AppColors.border),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Specialty picker
                _loadingSpecialties
                    ? const LinearProgressIndicator()
                    : DropdownButtonFormField<String?>(
                        value: _selectedSpecialtyId,
                        decoration: const InputDecoration(
                          labelText: 'Especialidade',
                          prefixIcon: Icon(Icons.medical_services_outlined),
                          contentPadding: EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                        ),
                        items: [
                          const DropdownMenuItem(
                            value: null,
                            child: Text('Todas as especialidades'),
                          ),
                          ..._specialties.map((s) => DropdownMenuItem(
                                value: s.id,
                                child: Text(s.name),
                              )),
                        ],
                        onChanged: (v) =>
                            setState(() => _selectedSpecialtyId = v),
                      ),
                const SizedBox(height: 12),

                // Date and Time row
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _dateController,
                        readOnly: true,
                        onTap: _selectDate,
                        decoration: const InputDecoration(
                          labelText: 'Data',
                          prefixIcon: Icon(Icons.calendar_today_outlined),
                          hintText: 'Selecionar data',
                          contentPadding: EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedTime,
                        decoration: const InputDecoration(
                          labelText: 'Horario',
                          prefixIcon: Icon(Icons.access_time),
                          contentPadding: EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                        ),
                        items: _timeOptions
                            .map((t) =>
                                DropdownMenuItem(value: t, child: Text(t)))
                            .toList(),
                        onChanged: (v) =>
                            setState(() => _selectedTime = v ?? '10:00'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Radius slider
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined,
                        size: 20, color: AppColors.textSecondary),
                    const SizedBox(width: 8),
                    Text('Raio: ${_radiusKm.round()} km',
                        style: const TextStyle(fontSize: 14)),
                    Expanded(
                      child: Slider(
                        value: _radiusKm,
                        min: 1,
                        max: 50,
                        divisions: 49,
                        onChanged: (v) => setState(() => _radiusKm = v),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                ElevatedButton.icon(
                  onPressed: searchState.isLoading ? null : _search,
                  icon: searchState.isLoading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.search),
                  label: const Text('Buscar Medicos'),
                ),
              ],
            ),
          ),

          // ─── Results ────────────────────────────────────────────
          Expanded(
            child: _buildResults(searchState),
          ),
        ],
      ),
    );
  }

  Widget _buildResults(DoctorSearchState state) {
    if (state.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              Text(state.error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              TextButton(onPressed: _search, child: const Text('Tentar novamente')),
            ],
          ),
        ),
      );
    }

    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_searching,
                  size: 64, color: AppColors.textTertiary),
              const SizedBox(height: 16),
              Text(
                'Busque medicos proximos a voce',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Selecione a especialidade, data e horario desejado e encontre medicos com disponibilidade na sua regiao.',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppColors.textTertiary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.results.length,
      itemBuilder: (context, index) {
        return DoctorMatchCard(
          match: state.results[index],
          selectedDate: _dateToIso(),
        );
      },
    );
  }
}
