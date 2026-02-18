import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/feed_provider.dart';
import '../../../core/models/post_model.dart';

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  @override
  void initState() {
    super.initState();
    timeago.setLocaleMessages('pt_BR', timeago.PtBrMessages());
    Future.microtask(() => ref.read(feedProvider.notifier).loadFeed());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(feedProvider);

    if (state.isLoading && state.posts.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: AppColors.primary,
        ),
      );
    }

    if (state.error != null && state.posts.isEmpty) {
      return _buildErrorState(state.error!);
    }

    if (state.posts.isEmpty) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(feedProvider.notifier).refresh(),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: state.posts.length,
        itemBuilder: (context, index) => _buildPostCard(state.posts[index]),
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.errorLight,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.cloud_off_outlined,
                size: 32,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Erro ao carregar',
              style: AppTextStyles.headingSmall,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: AppTextStyles.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => ref.read(feedProvider.notifier).loadFeed(),
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.article_outlined,
                size: 32,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Seu feed está vazio',
              style: AppTextStyles.headingSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Conecte-se com outros médicos para ver atualizações',
              style: AppTextStyles.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.push('/network'),
              icon: const Icon(Icons.people_outline, size: 18),
              label: const Text('Encontrar conexões'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPostCard(PostModel post) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header com avatar e nome
          Row(
            children: [
              _buildAvatar(post.authorName),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.authorName,
                      style: AppTextStyles.titleMedium,
                    ),
                    Text(
                      timeago.format(post.createdAt, locale: 'pt_BR'),
                      style: AppTextStyles.caption,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.more_horiz, size: 20),
                onPressed: () {},
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Conteúdo
          Text(
            post.content,
            style: AppTextStyles.bodyMedium,
          ),
          // Se tiver imagem
          if (post.mediaUrls.isNotEmpty) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                post.mediaUrls.first,
                fit: BoxFit.cover,
                width: double.infinity,
                height: 200,
              ),
            ),
          ],
          const SizedBox(height: 16),
          // Actions
          Row(
            children: [
              _buildActionButton(
                Icons.favorite_outline,
                '${post.likeCount}',
                onTap: () {},
              ),
              const SizedBox(width: 24),
              _buildActionButton(
                Icons.chat_bubble_outline,
                '${post.commentCount}',
                onTap: () {},
              ),
              const SizedBox(width: 24),
              _buildActionButton(
                Icons.share_outlined,
                'Compartilhar',
                onTap: () {},
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar(String name) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: AppTextStyles.titleMedium.copyWith(
            color: AppColors.primary,
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(IconData icon, String label, {required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Row(
        children: [
          Icon(
            icon,
            size: 18,
            color: AppColors.textSecondary,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppTextStyles.labelMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
