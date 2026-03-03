import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/institutions_provider.dart';

class InstitutionsScreen extends ConsumerStatefulWidget {
  const InstitutionsScreen({super.key});

  @override
  ConsumerState<InstitutionsScreen> createState() => _InstitutionsScreenState();
}

class _InstitutionsScreenState extends ConsumerState<InstitutionsScreen> {
  final _searchController = TextEditingController();
  String? _selectedType;

  static const _types = [
    'HOSPITAL',
    'CLINIC',
    'LABORATORY',
    'UNIVERSITY',
    'RESEARCH_CENTER',
  ];

  static const _typeLabels = {
    'HOSPITAL': 'Hospital',
    'CLINIC': 'Clínica',
    'LABORATORY': 'Laboratório',
    'UNIVERSITY': 'Universidade',
    'RESEARCH_CENTER': 'Centro de Pesquisa',
  };

  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(institutionsProvider.notifier).loadInstitutions());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(institutionsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: const Text(
          'Instituições',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(112),
          child: Column(
            children: [
              const Divider(height: 1),
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: TextField(
                  controller: _searchController,
                  onChanged: (v) =>
                      ref.read(institutionsProvider.notifier).search(v),
                  decoration: InputDecoration(
                    hintText: 'Buscar por nome ou cidade...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              ref
                                  .read(institutionsProvider.notifier)
                                  .search('');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: AppColors.surfaceVariant,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _FilterChip(
                      label: 'Todos',
                      selected: _selectedType == null,
                      onTap: () {
                        setState(() => _selectedType = null);
                        ref
                            .read(institutionsProvider.notifier)
                            .setFilters(type: null);
                      },
                    ),
                    ..._types.map((t) => _FilterChip(
                          label: _typeLabels[t] ?? t,
                          selected: _selectedType == t,
                          onTap: () {
                            setState(() => _selectedType = t);
                            ref
                                .read(institutionsProvider.notifier)
                                .setFilters(type: t);
                          },
                        )),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.institutions.isEmpty
              ? _ErrorState(
                  message: state.error!,
                  onRetry: () =>
                      ref.read(institutionsProvider.notifier).loadInstitutions(),
                )
              : state.institutions.isEmpty
                  ? _EmptyState(hasFilter: _selectedType != null)
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: state.institutions.length,
                      itemBuilder: (ctx, i) => _InstitutionCard(
                        institution: state.institutions[i],
                        onTap: () => context
                            .go('/institutions/${state.institutions[i]['id']}'),
                      ),
                    ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : AppColors.textSecondary,
              fontSize: 13,
              fontWeight:
                  selected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }
}

class _InstitutionCard extends StatelessWidget {
  final Map<String, dynamic> institution;
  final VoidCallback onTap;

  const _InstitutionCard({required this.institution, required this.onTap});

  static const _typeLabels = {
    'HOSPITAL': 'Hospital',
    'CLINIC': 'Clínica',
    'LABORATORY': 'Laboratório',
    'UNIVERSITY': 'Universidade',
    'RESEARCH_CENTER': 'Centro de Pesquisa',
  };

  static const _typeColors = {
    'HOSPITAL': Color(0xFF2563EB),
    'CLINIC': Color(0xFF10B981),
    'LABORATORY': Color(0xFF8B5CF6),
    'UNIVERSITY': Color(0xFFF59E0B),
    'RESEARCH_CENTER': Color(0xFF06B6D4),
  };

  @override
  Widget build(BuildContext context) {
    final type = institution['type'] as String? ?? '';
    final count = institution['_count']?['doctors'] ?? institution['doctorCount'] ?? 0;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: (_typeColors[type] ?? AppColors.primary).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _iconFor(type),
                color: _typeColors[type] ?? AppColors.primary,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          institution['name'] ?? '',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: (_typeColors[type] ?? AppColors.primary)
                              .withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          _typeLabels[type] ?? type,
                          style: TextStyle(
                            color: _typeColors[type] ?? AppColors.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 14, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        institution['city'] ?? '',
                        style: const TextStyle(
                            fontSize: 13, color: AppColors.textSecondary),
                      ),
                      if (institution['state'] != null) ...[
                        const Text(', ',
                            style: TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary)),
                        Text(
                          institution['state'] as String,
                          style: const TextStyle(
                              fontSize: 13, color: AppColors.textSecondary),
                        ),
                      ],
                      const Spacer(),
                      const Icon(Icons.people_outline,
                          size: 14, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        '$count médicos',
                        style: const TextStyle(
                            fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right,
                size: 20, color: AppColors.textTertiary),
          ],
        ),
      ),
    );
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'HOSPITAL':
        return Icons.local_hospital_outlined;
      case 'CLINIC':
        return Icons.medical_services_outlined;
      case 'LABORATORY':
        return Icons.science_outlined;
      case 'UNIVERSITY':
        return Icons.school_outlined;
      case 'RESEARCH_CENTER':
        return Icons.biotech_outlined;
      default:
        return Icons.business_outlined;
    }
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: AppColors.error),
          const SizedBox(height: 12),
          Text(message,
              style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: onRetry,
            child: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final bool hasFilter;

  const _EmptyState({required this.hasFilter});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.business_outlined,
              size: 56, color: AppColors.textTertiary),
          const SizedBox(height: 16),
          Text(
            hasFilter
                ? 'Nenhuma instituição encontrada para este filtro'
                : 'Nenhuma instituição cadastrada',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 16),
          ),
        ],
      ),
    );
  }
}
