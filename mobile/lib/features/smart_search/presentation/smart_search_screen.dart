import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:gap/gap.dart';
import '../../../core/theme/medconnect_theme.dart';
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

  final _exampleQueries = [
    {'query': 'Cardiologistas em Sao Paulo', 'icon': Icons.favorite, 'color': const Color(0xFFEF4444)},
    {'query': 'Quem sabe fazer ecocardiograma?', 'icon': Icons.medical_services, 'color': const Color(0xFF3B82F6)},
    {'query': 'Vagas de plantao noturno em UTI', 'icon': Icons.work, 'color': const Color(0xFF22C55E)},
    {'query': 'Onde trabalha a Dra. Ana Costa?', 'icon': Icons.business, 'color': const Color(0xFF8B5CF6)},
    {'query': 'Medicos mais conectados em Ortopedia', 'icon': Icons.hub, 'color': const Color(0xFFF59E0B)},
    {'query': 'Publicacoes sobre insuficiencia cardiaca', 'icon': Icons.article, 'color': const Color(0xFFEC4899)},
    {'query': 'Grupos de estudo em Cardiologia', 'icon': Icons.groups, 'color': const Color(0xFF06B6D4)},
    {'query': 'Lideres de opiniao em Medicina Intensiva', 'icon': Icons.star, 'color': const Color(0xFFEAB308)},
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null && widget.initialQuery!.isNotEmpty) {
      _searchController.text = widget.initialQuery!;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _performSearch(widget.initialQuery!);
      });
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
      backgroundColor: MedConnectColors.background,
      appBar: AppBar(
        title: const Text('Busca IA'),
        backgroundColor: MedConnectColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: MedConnectColors.primary,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
            ),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Pergunte qualquer coisa...',
                    hintStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
                    prefixIcon: const Icon(Icons.search, color: Colors.white),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white),
                      onPressed: () => _performSearch(_searchController.text),
                    ),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.2),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onSubmitted: _performSearch,
                ),
                const Gap(12),
                SizedBox(
                  height: 32,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _exampleQueries.length,
                    itemBuilder: (context, index) {
                      final example = _exampleQueries[index];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ActionChip(
                          avatar: Icon(example['icon'] as IconData, size: 16, color: example['color'] as Color),
                          label: Text(example['query'] as String, style: const TextStyle(fontSize: 11)),
                          backgroundColor: Colors.white.withOpacity(0.9),
                          onPressed: () {
                            _searchController.text = example['query'] as String;
                            _performSearch(example['query'] as String);
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: state.isSearching
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        Gap(16),
                        Text('Consultando o grafo...'),
                      ],
                    ),
                  )
                : state.error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: Colors.red),
                            const Gap(16),
                            Text('Erro: ${state.error}'),
                            const Gap(16),
                            ElevatedButton(
                              onPressed: () => ref.read(searchProvider.notifier).clear(),
                              child: const Text('Tentar novamente'),
                            ),
                          ],
                        ),
                      )
                    : _buildResults(context, state.result),
          ),
        ],
      ),
    );
  }

  Widget _buildResults(BuildContext context, SearchResult? result) {
    if (result == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.psychology_outlined, size: 64, color: MedConnectColors.textSecondary),
            const Gap(16),
            Text(
              'Faça uma pergunta sobre médicos,\nvagas, instituições ou conexões',
              textAlign: TextAlign.center,
              style: TextStyle(color: MedConnectColors.textSecondary, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (result.answer.isNotEmpty) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: MedConnectColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.psychology, color: MedConnectColors.primary, size: 20),
                        ),
                        const Gap(12),
                        const Text('Resposta da IA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                    const Gap(12),
                    Text(result.answer),
                  ],
                ),
              ),
            ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.1),
            const Gap(16),
          ],
          if (result.toolsUsed?.isNotEmpty == true) ...[
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: result.toolsUsed!.map((tool) {
                return Chip(
                  avatar: const Icon(Icons.build, size: 14),
                  label: Text(tool, style: const TextStyle(fontSize: 10)),
                  backgroundColor: MedConnectColors.secondary,
                );
              }).toList(),
            ).animate().fadeIn(delay: 200.ms),
            const Gap(16),
          ],
          if (result.results.isNotEmpty) ...[
            Text('Resultados', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const Gap(12),
            ...result.results.map((item) {
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: _buildResultIcon(item.type),
                  title: Text(item.title),
                  subtitle: item.subtitle != null ? Text(item.subtitle!) : null,
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    // Navigate based on result type
                    switch (item.type) {
                      case 'doctor':
                        context.push('/smart-search?query=${Uri.encodeComponent(item.title)}');
                        break;
                      case 'job':
                        context.push('/jobs');
                        break;
                      case 'institution':
                        context.push('/smart-search?query=${Uri.encodeComponent(item.title)}');
                        break;
                      default:
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Detalhes de ${item.title}')),
                        );
                    }
                  },
                ),
              ).animate().fadeIn(duration: 200.ms).slideX(begin: 0.1);
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildResultIcon(String? type) {
    IconData icon;
    Color color;

    switch (type) {
      case 'doctor':
        icon = Icons.person;
        color = MedConnectColors.primary;
        break;
      case 'job':
        icon = Icons.work;
        color = MedConnectColors.success;
        break;
      case 'institution':
        icon = Icons.business;
        color = MedConnectColors.warning;
        break;
      case 'publication':
        icon = Icons.article;
        color = MedConnectColors.secondary;
        break;
      default:
        icon = Icons.circle;
        color = MedConnectColors.textSecondary;
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
      child: Icon(icon, color: color),
    );
  }
}
