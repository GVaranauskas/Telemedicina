import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/connection_provider.dart';
import '../../../core/models/connection_model.dart';

class ConnectionsScreen extends ConsumerStatefulWidget {
  const ConnectionsScreen({super.key});

  @override
  ConsumerState<ConnectionsScreen> createState() => _ConnectionsScreenState();
}

class _ConnectionsScreenState extends ConsumerState<ConnectionsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(connectionProvider.notifier).loadAll());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(connectionProvider);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Minha Rede'),
          actions: [
            IconButton(
              icon: const Icon(Icons.hub_outlined),
              tooltip: 'Ver Grafo',
              onPressed: () => context.go('/network'),
            ),
          ],
          bottom: TabBar(
            tabs: [
              Tab(text: 'Conexões (${state.connections.length})'),
              Tab(text: 'Convites (${state.pendingRequests.length})'),
              Tab(text: 'Sugestões (${state.suggestions.length})'),
            ],
          ),
        ),
        body: state.isLoading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                children: [
                  _buildConnectionsList(state.connections),
                  _buildPendingRequests(state.pendingRequests),
                  _buildSuggestions(state.suggestions),
                ],
              ),
      ),
    );
  }

  Widget _buildConnectionsList(List<ConnectionModel> connections) {
    if (connections.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: AppColors.textSecondary),
            SizedBox(height: 16),
            Text('Nenhuma conexão ainda',
                style: TextStyle(color: AppColors.textSecondary)),
            Text('Explore as sugestões para começar!',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: () => ref.read(connectionProvider.notifier).loadAll(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: connections.length,
        itemBuilder: (context, index) {
          final conn = connections[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              onTap: () => context.push('/doctor/${conn.id}'),
              leading: CircleAvatar(
                backgroundColor: AppColors.primaryLight,
                backgroundImage: conn.profilePicUrl != null
                    ? NetworkImage(conn.profilePicUrl!)
                    : null,
                child: conn.profilePicUrl == null
                    ? Text(conn.fullName.isNotEmpty
                        ? conn.fullName[0].toUpperCase()
                        : '?')
                    : null,
              ),
              title: Text(conn.fullName),
              subtitle: Text(
                [conn.primarySpecialty, conn.locationFormatted]
                    .where((e) => e != null && e.isNotEmpty)
                    .join(' - '),
                style: const TextStyle(fontSize: 13),
              ),
              trailing: IconButton(
                icon: const Icon(Icons.message_outlined,
                    color: AppColors.primary),
                onPressed: () => context.push('/chat/${conn.id}', extra: {
                  'otherUserName': conn.fullName,
                  'otherUserId': conn.id,
                }),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPendingRequests(List<ConnectionRequestModel> requests) {
    if (requests.isEmpty) {
      return const Center(
        child: Text('Nenhum convite pendente',
            style: TextStyle(color: AppColors.textSecondary)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: requests.length,
      itemBuilder: (context, index) {
        final req = requests[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: InkWell(
            onTap: () => context.push('/doctor/${req.sender.id}'),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: AppColors.primaryLight,
                    child: Text(req.sender.fullName.isNotEmpty
                        ? req.sender.fullName[0].toUpperCase()
                        : '?'),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(req.sender.fullName,
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text(
                        req.sender.primarySpecialty ?? '',
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () =>
                      ref.read(connectionProvider.notifier).acceptRequest(req.id),
                  style: ElevatedButton.styleFrom(
                      minimumSize: const Size(70, 36)),
                  child: const Text('Aceitar'),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () =>
                      ref.read(connectionProvider.notifier).rejectRequest(req.id),
                  style: OutlinedButton.styleFrom(
                      minimumSize: const Size(70, 36)),
                  child: const Text('Rejeitar'),
                ),
              ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSuggestions(List<ConnectionSuggestion> suggestions) {
    if (suggestions.isEmpty) {
      return const Center(
        child: Text('Nenhuma sugestão no momento',
            style: TextStyle(color: AppColors.textSecondary)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: suggestions.length,
      itemBuilder: (context, index) {
        final sug = suggestions[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: InkWell(
            onTap: () => context.push('/doctor/${sug.doctorId}'),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: AppColors.primaryLight,
                    child: Text(sug.fullName.isNotEmpty
                        ? sug.fullName[0].toUpperCase()
                        : '?'),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(sug.fullName,
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text(
                        sug.reason ??
                            (sug.mutualConnections > 0
                                ? '${sug.mutualConnections} conexões em comum'
                                : sug.specialty ?? ''),
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: () => ref
                      .read(connectionProvider.notifier)
                      .sendRequest(sug.doctorId),
                  icon: const Icon(Icons.person_add, size: 16),
                  label: const Text('Conectar'),
                ),
              ],
              ),
            ),
          ),
        );
      },
    );
  }
}
