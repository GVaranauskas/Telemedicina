import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/theme/medconnect_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/connection_provider.dart';
import '../../../core/network/api_client.dart';

// Models
class NetworkStats {
  final int connections;
  final int followers;
  final int following;
  final int skills;
  final int endorsements;
  final double? pageRank;
  final double? betweenness;

  NetworkStats({
    required this.connections,
    required this.followers,
    required this.following,
    required this.skills,
    required this.endorsements,
    this.pageRank,
    this.betweenness,
  });

  factory NetworkStats.fromJson(Map<String, dynamic> json) {
    return NetworkStats(
      connections: json['connections'] ?? 0,
      followers: json['followers'] ?? 0,
      following: json['following'] ?? 0,
      skills: json['skillCount'] ?? json['skills'] ?? 0,
      endorsements: json['endorsements'] ?? 0,
      pageRank: (json['pageRank'] as num?)?.toDouble(),
      betweenness: (json['betweenness'] as num?)?.toDouble(),
    );
  }
}

class SuggestedConnection {
  final String id;
  final String name;
  final String? picUrl;
  final int mutualConnections;
  final String? specialty;

  SuggestedConnection({
    required this.id,
    required this.name,
    this.picUrl,
    required this.mutualConnections,
    this.specialty,
  });

  factory SuggestedConnection.fromJson(Map<String, dynamic> json) {
    return SuggestedConnection(
      id: json['id'] ?? '',
      name: json['name'] ?? json['fullName'] ?? '',
      picUrl: json['picUrl'] ?? json['profilePicUrl'],
      mutualConnections: json['mutualConnections'] ?? 0,
      specialty: json['specialty'],
    );
  }
}

class HighlightedDoctor {
  final String id;
  final String name;
  final String? picUrl;
  final int sharedSpecs;
  final int connections;
  final String? specialty;

  HighlightedDoctor({
    required this.id,
    required this.name,
    this.picUrl,
    required this.sharedSpecs,
    required this.connections,
    this.specialty,
  });

  factory HighlightedDoctor.fromJson(Map<String, dynamic> json) {
    return HighlightedDoctor(
      id: json['id'] ?? '',
      name: json['name'] ?? json['fullName'] ?? '',
      picUrl: json['picUrl'] ?? json['profilePicUrl'],
      sharedSpecs: json['sharedSpecs'] ?? json['sharedSpecialties'] ?? 0,
      connections: json['connections'] ?? 0,
      specialty: json['specialty'],
    );
  }
}

class NetworkData {
  final NetworkStats? stats;
  final List<SuggestedConnection> suggestedConnections;
  final List<HighlightedDoctor> highlightedDoctors;
  final String? insights;

  NetworkData({
    this.stats,
    required this.suggestedConnections,
    required this.highlightedDoctors,
    this.insights,
  });
}

// Provider
final networkDataProvider = FutureProvider<NetworkData>((ref) async {
  final authState = ref.watch(authProvider);
  if (authState.user == null) throw Exception('Not authenticated');

  final token = await ApiClient.getAccessToken();
  if (token == null) throw Exception('No token');

  final dio = ApiClient().dio;
  final response = await dio.get(
    '/agentic-search/recommendations',
    options: Options(headers: {'Authorization': 'Bearer $token'}),
  );

  final data = response.data;
  return NetworkData(
    stats: data['networkStats'] != null
        ? NetworkStats.fromJson(data['networkStats'])
        : null,
    suggestedConnections: (data['suggestedConnections'] as List?)
            ?.map((e) => SuggestedConnection.fromJson(e))
            .toList() ??
        [],
    highlightedDoctors: (data['highlightedDoctors'] as List?)
            ?.map((e) => HighlightedDoctor.fromJson(e))
            .toList() ??
        [],
    insights: data['insights']?['summary'],
  );
});

// Screen
class NetworkGraphScreen extends ConsumerWidget {
  const NetworkGraphScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkData = ref.watch(networkDataProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Minha Rede'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(networkDataProvider),
          ),
        ],
      ),
      body: networkData.when(
        data: (data) => _buildContent(context, ref, data),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Erro ao carregar rede: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(networkDataProvider),
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, NetworkData data) {
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(networkDataProvider),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (data.stats != null) ...[
              _buildStatsSection(context, data.stats!),
              const SizedBox(height: 24),
            ],
            if (data.stats?.pageRank != null)
              _buildInfluenceBadge(context, data.stats!),
            if (data.insights != null) ...[
              _buildInsightsCard(context, data.insights!),
              const SizedBox(height: 24),
            ],
            if (data.suggestedConnections.isNotEmpty) ...[
              Text(
                'Sugestões de Conexão',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 160,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: data.suggestedConnections.length,
                  itemBuilder: (context, index) {
                    return _buildSuggestionCard(
                      context,
                      ref,
                      data.suggestedConnections[index],
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],
            if (data.highlightedDoctors.isNotEmpty) ...[
              Text(
                'Destaques na Sua Área',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Column(
                children: data.highlightedDoctors
                    .take(5)
                    .map((d) => _buildHighlightedCard(context, d))
                    .toList(),
              ),
              const SizedBox(height: 24),
            ],
            _buildQuickActions(context),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSection(BuildContext context, NetworkStats stats) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Estatísticas da Rede',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _buildStatItem(context, Icons.people, stats.connections.toString(), 'Conexões', MedConnectColors.primary),
                _buildStatItem(context, Icons.person_add, stats.followers.toString(), 'Seguidores', MedConnectColors.secondary),
                _buildStatItem(context, Icons.star, stats.endorsements.toString(), 'Endossos', MedConnectColors.warning),
                _buildStatItem(context, Icons.build, stats.skills.toString(), 'Skills', MedConnectColors.success),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(BuildContext context, IconData icon, String value, String label, Color color) {
    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 8),
          Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: color)),
          Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: MedConnectColors.textSecondary), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _buildInfluenceBadge(BuildContext context, NetworkStats stats) {
    final pageRank = stats.pageRank ?? 0;
    String level;
    Color color;
    IconData icon;

    if (pageRank > 0.1) {
      level = 'Influenciador';
      color = MedConnectColors.success;
      icon = Icons.emoji_events;
    } else if (pageRank > 0.05) {
      level = 'Conector';
      color = MedConnectColors.primary;
      icon = Icons.hub;
    } else if (pageRank > 0.01) {
      level = 'Ativo';
      color = MedConnectColors.secondary;
      icon = Icons.people;
    } else {
      level = 'Iniciante';
      color = MedConnectColors.textSecondary;
      icon = Icons.person;
    }

    return Card(
      color: color.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: color, shape: BoxShape.circle), child: Icon(icon, color: Colors.white, size: 28)),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Nível de Influência: $level', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('PageRank: ${pageRank.toStringAsFixed(4)}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: MedConnectColors.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInsightsCard(BuildContext context, String insights) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: MedConnectColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.psychology, color: MedConnectColors.primary, size: 20)),
                const SizedBox(width: 12),
                Text('Insights da IA', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            Text(insights, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggestionCard(BuildContext context, WidgetRef ref, SuggestedConnection suggestion) {
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              CircleAvatar(radius: 28, backgroundImage: suggestion.picUrl != null ? NetworkImage(suggestion.picUrl!) : null, child: suggestion.picUrl == null ? Text(suggestion.name.isNotEmpty ? suggestion.name[0].toUpperCase() : '?', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)) : null),
              const SizedBox(height: 8),
              Text(suggestion.name, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold), maxLines: 2, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 28,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(padding: EdgeInsets.zero, backgroundColor: MedConnectColors.primary),
                  onPressed: () {
                    ref.read(connectionProvider.notifier).sendRequest(suggestion.id);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Solicitação enviada para ${suggestion.name}')),
                    );
                  },
                  child: const Text('Conectar', style: TextStyle(fontSize: 11, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHighlightedCard(BuildContext context, HighlightedDoctor doctor) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(backgroundImage: doctor.picUrl != null ? NetworkImage(doctor.picUrl!) : null, child: doctor.picUrl == null ? Text(doctor.name.isNotEmpty ? doctor.name[0].toUpperCase() : '?') : null),
        title: Text(doctor.name),
        subtitle: Text('${doctor.specialty ?? ''} • ${doctor.connections} conexões'),
        trailing: doctor.sharedSpecs > 0 ? Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: MedConnectColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(12)), child: Text('${doctor.sharedSpecs} em comum', style: TextStyle(color: MedConnectColors.primary, fontSize: 10))) : null,
        onTap: () => context.push('/smart-search?query=${Uri.encodeComponent(doctor.name)}'),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Ações Rápidas', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _buildActionCard(context, Icons.people_outline, 'Mentores', MedConnectColors.primary, () => context.push('/smart-search?query=mentores na minha área'))),
            const SizedBox(width: 12),
            Expanded(child: _buildActionCard(context, Icons.work_outline, 'Vagas', MedConnectColors.success, () => context.go('/jobs'))),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _buildActionCard(context, Icons.event, 'Eventos', MedConnectColors.warning, () => context.push('/smart-search?query=próximos eventos e congressos'))),
            const SizedBox(width: 12),
            Expanded(child: _buildActionCard(context, Icons.school_outlined, 'Cursos', MedConnectColors.secondary, () => context.push('/smart-search?query=cursos recomendados para mim'))),
          ],
        ),
      ],
    );
  }

  Widget _buildActionCard(BuildContext context, IconData icon, String label, Color color, VoidCallback onTap) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: color, size: 28)),
              const SizedBox(height: 8),
              Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
