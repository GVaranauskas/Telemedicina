import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/search_provider.dart';
import '../../../core/models/search_model.dart';

class SmartSearchScreen extends ConsumerStatefulWidget {
  final String? initialQuery;
  
  const SmartSearchScreen({super.key, this.initialQuery});

  @override
  ConsumerState<SmartSearchScreen> createState() => _SmartSearchScreenState();
}

class _SmartSearchScreenState extends ConsumerState<SmartSearchScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null && widget.initialQuery!.isNotEmpty) {
      _searchController.text = widget.initialQuery!;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _performSearch(String query) {
    if (query.trim().isEmpty) return;
    ref.read(searchProvider.notifier).search(query.trim());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(searchProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Search Header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              color: AppColors.surface,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Buscar', style: AppTextStyles.headingMedium),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Buscar médicos, vagas, conteúdo...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.arrow_forward, size: 20),
                        onPressed: () => _performSearch(_searchController.text),
                      ),
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    onSubmitted: _performSearch,
                  ),
                ],
              ),
            ),
            // Results or Empty State
            Expanded(
              child: state.isSearching
                  ? const Center(child: CircularProgressIndicator())
                  : state.error != null
                      ? _buildErrorState(state.error!)
                      : state.result == null
                          ? _buildEmptyState()
                          : _buildResults(state),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 12),
            Text('Erro na busca', style: AppTextStyles.titleMedium),
            const SizedBox(height: 8),
            Text(
              error,
              style: AppTextStyles.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => _performSearch(_searchController.text),
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    final suggestions = [
      'Cardiologistas em São Paulo',
      'Vagas de plantão noturno',
      'Congressos de neurologia 2026',
      'Médicos especialistas em diabetes',
      'Cursos de cirurgia robótica',
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(
                    Icons.psychology,
                    size: 40,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 16),
                Text('Busca Inteligente', style: AppTextStyles.headingSmall),
                const SizedBox(height: 8),
                Text(
                  'Faça perguntas em linguagem natural sobre médicos, vagas e eventos',
                  style: AppTextStyles.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          Text('Sugestões de busca', style: AppTextStyles.titleSmall),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: suggestions.map((s) {
              return ActionChip(
                label: Text(s, style: const TextStyle(fontSize: 13)),
                onPressed: () {
                  _searchController.text = s;
                  _performSearch(s);
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildResults(dynamic state) {
    final searchResult = state.result as SearchResult?;
    if (searchResult == null) return _buildEmptyState();
    if (searchResult.answer.isEmpty && searchResult.results.isEmpty) {
      return _buildEmptyState();
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // AI Answer Card
        if (searchResult.answer.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.primary.withOpacity(0.08),
                  AppColors.accent.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primary.withOpacity(0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.psychology,
                        size: 16,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Resposta da IA',
                      style: AppTextStyles.titleSmall.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(searchResult.answer, style: AppTextStyles.bodySmall),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Results count
        if (searchResult.results.isNotEmpty) ...[
          Text(
            '${searchResult.results.length} resultado${searchResult.results.length != 1 ? 's' : ''} encontrado${searchResult.results.length != 1 ? 's' : ''}',
            style: AppTextStyles.labelMedium,
          ),
          const SizedBox(height: 12),
        ],

        // Result items
        ...searchResult.results.map((item) => _buildResultCard(item)),
      ],
    );
  }

  Widget _buildResultCard(SearchResultItem item) {
    final (icon, color, actionLabel, onAction) = _getItemMeta(item);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: onAction,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon badge
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 12),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: AppTextStyles.titleMedium.copyWith(
                              fontSize: 14,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        _buildTypeBadge(item.type),
                      ],
                    ),
                    if (item.subtitle != null && item.subtitle!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        item.subtitle!,
                        style: AppTextStyles.bodySmall,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: onAction,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          actionLabel,
                          style: TextStyle(
                            color: color,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTypeBadge(String type) {
    final (label, color) = switch (type.toLowerCase()) {
      'doctor' || 'medico' => ('Médico', AppColors.primary),
      'job' || 'vaga' => ('Vaga', AppColors.success),
      'event' || 'evento' => ('Evento', AppColors.warning),
      'publication' || 'publicacao' => ('Publicação', AppColors.accent),
      'course' || 'curso' => ('Curso', AppColors.secondary),
      'institution' || 'instituicao' => ('Hospital', AppColors.error),
      _ => ('Resultado', AppColors.textTertiary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  (IconData, Color, String, VoidCallback?) _getItemMeta(SearchResultItem item) {
    switch (item.type.toLowerCase()) {
      case 'doctor':
      case 'medico':
        return (
          Icons.medical_services,
          AppColors.primary,
          'Ver Perfil',
          () => item.id.isNotEmpty
              ? context.push('/doctor/${item.id}')
              : context.push('/search?query=${Uri.encodeComponent(item.title)}'),
        );
      case 'job':
      case 'vaga':
        return (
          Icons.work,
          AppColors.success,
          'Ver Vaga',
          () => context.go('/jobs'),
        );
      case 'event':
      case 'evento':
        return (
          Icons.event,
          AppColors.warning,
          'Ver Evento',
          () => context.push(
              '/search?query=${Uri.encodeComponent(item.title)}'),
        );
      case 'publication':
      case 'publicacao':
        return (
          Icons.article,
          AppColors.accent,
          'Ler Publicação',
          () => ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Abrindo: ${item.title}')),
          ),
        );
      case 'course':
      case 'curso':
        return (
          Icons.school,
          AppColors.secondary,
          'Ver Curso',
          () => ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Abrindo curso: ${item.title}')),
          ),
        );
      default:
        return (
          Icons.info_outline,
          AppColors.textTertiary,
          'Ver Detalhes',
          () => ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(item.title)),
          ),
        );
    }
  }
}