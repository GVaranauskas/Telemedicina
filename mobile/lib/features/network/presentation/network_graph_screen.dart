import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:graphview/GraphView.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/connection_provider.dart';
import '../../../core/models/connection_model.dart';

// ─── Specialty colors for node visualization ──────────────────────────────

const Map<String, Color> _specialtyColors = {
  'Cardiologia': Color(0xFFE53E3E),
  'Neurologia': Color(0xFF805AD5),
  'Oncologia Clínica': Color(0xFFDD6B20),
  'Ortopedia e Traumatologia': Color(0xFF2B6CB0),
  'Endocrinologia': Color(0xFF285E61),
  'Infectologia': Color(0xFF276749),
  'Psiquiatria': Color(0xFF553C9A),
  'Gastroenterologia': Color(0xFF9C4221),
  'Ginecologia e Obstetrícia': Color(0xFFB7791F),
  'Medicina Intensiva': Color(0xFFC53030),
  'Dermatologia': Color(0xFFB794F4),
  'Cirurgia Cardiovascular': Color(0xFF9B2335),
  'Pediatria': Color(0xFF2C7A7B),
  'Pneumologia': Color(0xFF2A69AC),
  'Reumatologia': Color(0xFF6B46C1),
};

Color _colorForSpecialty(String? specialty) {
  if (specialty == null) return AppColors.primary;
  return _specialtyColors[specialty] ?? AppColors.primary;
}

// ─── Screen ───────────────────────────────────────────────────────────────

class NetworkGraphScreen extends ConsumerStatefulWidget {
  const NetworkGraphScreen({super.key});

  @override
  ConsumerState<NetworkGraphScreen> createState() => _NetworkGraphScreenState();
}

class _NetworkGraphScreenState extends ConsumerState<NetworkGraphScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _selectedNodeId;
  ConnectionModel? _selectedConnection;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    Future.microtask(() => ref.read(connectionProvider.notifier).loadAll());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: const Text(
          'Grafo da Rede',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.people_outlined),
            tooltip: 'Ir para Conexões',
            onPressed: () => context.go('/connections'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Atualizar',
            onPressed: () {
              ref.read(connectionProvider.notifier).loadAll();
              setState(() {
                _selectedNodeId = null;
                _selectedConnection = null;
              });
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Grafo Visual', icon: Icon(Icons.hub, size: 16)),
            Tab(text: 'Estatísticas', icon: Icon(Icons.bar_chart, size: 16)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildGraphTab(),
          _buildStatsTab(),
        ],
      ),
    );
  }

  // ─── Graph Tab ────────────────────────────────────────────────────────────

  Widget _buildGraphTab() {
    final connState = ref.watch(connectionProvider);
    final authState = ref.watch(authProvider);
    final user = authState.user;

    if (connState.isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Carregando grafo da rede...'),
          ],
        ),
      );
    }

    if (connState.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(connState.error!),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(connectionProvider.notifier).loadAll(),
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      );
    }

    final connections = connState.connections;

    if (connections.isEmpty) {
      return _buildEmptyGraph(context);
    }

    final graph = Graph()..isTree = false;
    final algorithm = FruchtermanReingoldAlgorithm(
      FruchtermanReingoldConfiguration(iterations: 1000),
    );

    // Current user node (center)
    final currentUserId = user?.doctorId ?? user?.id ?? 'me';
    final meNode = Node.Id(currentUserId);
    graph.addNode(meNode);

    // Connection nodes + edges from me
    final nodeMap = <String, Node>{currentUserId: meNode};

    for (final conn in connections) {
      final node = Node.Id(conn.id);
      nodeMap[conn.id] = node;
      graph.addNode(node);
      graph.addEdge(meNode, node);
    }

    // Add edges between connections who share the same specialty
    for (int i = 0; i < connections.length; i++) {
      for (int j = i + 1; j < connections.length; j++) {
        final a = connections[i];
        final b = connections[j];
        if (a.primarySpecialty != null &&
            a.primarySpecialty == b.primarySpecialty) {
          final nodeA = nodeMap[a.id];
          final nodeB = nodeMap[b.id];
          if (nodeA != null && nodeB != null) {
            graph.addEdge(nodeA, nodeB,
                paint: Paint()
                  ..color = _colorForSpecialty(a.primarySpecialty)
                      .withOpacity(0.3)
                  ..strokeWidth = 1.5);
          }
        }
      }
    }

    return Column(
      children: [
        // Legend
        _buildLegend(connections),
        // Graph canvas
        Expanded(
          child: Stack(
            children: [
              InteractiveViewer(
                constrained: false,
                boundaryMargin: const EdgeInsets.all(100),
                minScale: 0.5,
                maxScale: 2.5,
                child: GraphView(
                  graph: graph,
                  algorithm: algorithm,
                  paint: Paint()
                    ..color = AppColors.border
                    ..strokeWidth = 1.5
                    ..style = PaintingStyle.stroke,
                  builder: (node) {
                    final nodeId = node.key?.value as String?;
                    final isMe = nodeId == currentUserId;

                    if (isMe) {
                      return _buildMeNode(user?.fullName ?? 'Você');
                    }

                    final conn = connections.firstWhere(
                      (c) => c.id == nodeId,
                      orElse: () => ConnectionModel(
                        id: nodeId ?? '',
                        fullName: '?',
                        crm: '',
                        crmState: '',
                      ),
                    );

                    final isSelected = _selectedNodeId == nodeId;
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          if (_selectedNodeId == nodeId) {
                            _selectedNodeId = null;
                            _selectedConnection = null;
                          } else {
                            _selectedNodeId = nodeId;
                            _selectedConnection = conn;
                          }
                        });
                      },
                      child: _buildConnectionNode(conn, isSelected),
                    );
                  },
                ),
              ),
              // Selected node info panel
              if (_selectedConnection != null)
                Positioned(
                  bottom: 16,
                  left: 16,
                  right: 16,
                  child: _buildNodeInfoCard(_selectedConnection!),
                ),
              // Tip
              if (_selectedConnection == null)
                Positioned(
                  bottom: 16,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Toque em um nó para ver detalhes • Pinch para zoom',
                        style: TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMeNode(String name) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: AppColors.primary,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withOpacity(0.4),
                blurRadius: 12,
                spreadRadius: 2,
              ),
            ],
          ),
          child: const Icon(Icons.person, color: Colors.white, size: 28),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Text(
            'Você',
            style: TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildConnectionNode(ConnectionModel conn, bool isSelected) {
    final color = _colorForSpecialty(conn.primarySpecialty);
    final firstName = conn.fullName.split(' ').first;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: isSelected ? 52 : 44,
          height: isSelected ? 52 : 44,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: isSelected ? Colors.white : color.withOpacity(0.3),
              width: isSelected ? 3 : 2,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: color.withOpacity(0.5),
                      blurRadius: 10,
                      spreadRadius: 2,
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Text(
              conn.fullName.isNotEmpty
                  ? conn.fullName[0].toUpperCase()
                  : '?',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          firstName,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? color : AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildNodeInfoCard(ConnectionModel conn) {
    final color = _colorForSpecialty(conn.primarySpecialty);
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  conn.fullName.isNotEmpty ? conn.fullName[0].toUpperCase() : '?',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    conn.fullName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (conn.primarySpecialty != null)
                    Text(
                      conn.primarySpecialty!,
                      style: TextStyle(color: color, fontSize: 12),
                    ),
                  if (conn.city != null)
                    Text(
                      conn.locationFormatted,
                      style: TextStyle(
                          color: AppColors.textSecondary, fontSize: 12),
                    ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.message_outlined),
              onPressed: () {
                context.push('/chat/${conn.id}', extra: {
                  'otherUserName': conn.fullName,
                  'otherUserId': conn.id,
                });
              },
            ),
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () {
                setState(() {
                  _selectedNodeId = null;
                  _selectedConnection = null;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegend(List<ConnectionModel> connections) {
    final specialties = connections
        .where((c) => c.primarySpecialty != null)
        .map((c) => c.primarySpecialty!)
        .toSet()
        .toList();

    if (specialties.isEmpty) return const SizedBox.shrink();

    return Container(
      height: 40,
      color: AppColors.surface,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: specialties.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final spec = specialties[i];
          final color = _colorForSpecialty(spec);
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 4),
              Text(spec, style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildEmptyGraph(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.primaryLight.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.hub_outlined, size: 64, color: AppColors.primary),
            ),
            const SizedBox(height: 24),
            Text(
              'Seu grafo está vazio',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Conecte-se com outros médicos para ver seu grafo de rede em ação.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              icon: const Icon(Icons.people),
              label: const Text('Explorar Conexões'),
              onPressed: () => context.go('/connections'),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Stats Tab ────────────────────────────────────────────────────────────

  Widget _buildStatsTab() {
    final connState = ref.watch(connectionProvider);

    if (connState.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final connections = connState.connections;
    final suggestions = connState.suggestions;

    // Specialty distribution
    final specCounts = <String, int>{};
    for (final conn in connections) {
      if (conn.primarySpecialty != null) {
        specCounts[conn.primarySpecialty!] =
            (specCounts[conn.primarySpecialty!] ?? 0) + 1;
      }
    }
    final sortedSpecs = specCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    // State distribution
    final stateCounts = <String, int>{};
    for (final conn in connections) {
      if (conn.state != null) {
        stateCounts[conn.state!] = (stateCounts[conn.state!] ?? 0) + 1;
      }
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary cards
          Row(
            children: [
              _buildStatCard(
                  context, '${connections.length}', 'Conexões',
                  Icons.people, AppColors.primary),
              const SizedBox(width: 12),
              _buildStatCard(
                  context, '${suggestions.length}', 'Sugestões',
                  Icons.person_add, AppColors.success),
            ],
          ),
          const SizedBox(height: 24),

          // Specialty distribution
          if (sortedSpecs.isNotEmpty) ...[
            Text(
              'Conexões por Especialidade',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: sortedSpecs.take(8).map((entry) {
                    final color = _colorForSpecialty(entry.key);
                    final maxCount = sortedSpecs.first.value;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                    color: color, shape: BoxShape.circle),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  entry.key,
                                  style: const TextStyle(fontSize: 13),
                                ),
                              ),
                              Text(
                                '${entry.value}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: color,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          LinearProgressIndicator(
                            value: maxCount > 0 ? entry.value / maxCount : 0,
                            backgroundColor: color.withOpacity(0.1),
                            valueColor: AlwaysStoppedAnimation<Color>(color),
                            minHeight: 6,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],

          // State distribution
          if (stateCounts.isNotEmpty) ...[
            Text(
              'Conexões por Estado',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: stateCounts.entries.map((entry) {
                    return Chip(
                      label: Text(
                        '${entry.key}: ${entry.value}',
                        style: const TextStyle(fontSize: 12),
                      ),
                      backgroundColor: AppColors.primaryLight.withOpacity(0.2),
                    );
                  }).toList(),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Suggestions to expand network
          if (suggestions.isNotEmpty) ...[
            Text(
              'Expandir sua Rede',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...suggestions.take(5).map((sug) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: _colorForSpecialty(sug.specialty),
                  child: Text(
                    sug.fullName.isNotEmpty
                        ? sug.fullName[0].toUpperCase()
                        : '?',
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
                title: Text(sug.fullName),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (sug.specialty != null) Text(sug.specialty!),
                    if (sug.mutualConnections > 0)
                      Text(
                        '${sug.mutualConnections} conexões em comum',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 11,
                        ),
                      ),
                  ],
                ),
                trailing: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    minimumSize: Size.zero,
                  ),
                  onPressed: () {
                    ref
                        .read(connectionProvider.notifier)
                        .sendRequest(sug.doctorId);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Solicitação enviada para ${sug.fullName}'),
                      ),
                    );
                  },
                  child: const Text('Conectar', style: TextStyle(fontSize: 12)),
                ),
              ),
            )),
          ],
        ],
      ),
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    String value,
    String label,
    IconData icon,
    Color color,
  ) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(icon, color: color, size: 32),
              const SizedBox(height: 8),
              Text(
                value,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(
                label,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
