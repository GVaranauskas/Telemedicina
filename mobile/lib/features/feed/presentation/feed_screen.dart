import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
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
          color: Color(0xFF1D9BF0),
        ),
      );
    }

    if (state.error != null && state.posts.isEmpty) {
      return _buildError(state.error!);
    }

    if (state.posts.isEmpty) {
      return _buildEmpty();
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(feedProvider.notifier).refresh(),
      color: const Color(0xFF1D9BF0),
      child: ListView.separated(
        padding: EdgeInsets.zero,
        itemCount: state.posts.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, color: Color(0xFFEFF3F4)),
        itemBuilder: (context, index) =>
            _Post(post: state.posts[index], index: index),
      ),
    );
  }

  Widget _buildError(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off_outlined,
                size: 48, color: Color(0xFF536471)),
            const SizedBox(height: 16),
            const Text('Algo deu errado',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F1419))),
            const SizedBox(height: 8),
            Text(error,
                style: const TextStyle(fontSize: 15, color: Color(0xFF536471)),
                textAlign: TextAlign.center),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => ref.read(feedProvider.notifier).loadFeed(),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF1D9BF0),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20)),
              ),
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.article_outlined,
                size: 48, color: Color(0xFF536471)),
            const SizedBox(height: 16),
            const Text('Seu feed está vazio',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F1419))),
            const SizedBox(height: 8),
            const Text('Conecte-se com outros médicos para ver atualizações',
                style: TextStyle(fontSize: 15, color: Color(0xFF536471)),
                textAlign: TextAlign.center),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.push('/connections'),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF1D9BF0),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20)),
              ),
              child: const Text('Encontrar conexões'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Post Widget ──────────────────────────────────────────────────────────────

class _Post extends ConsumerStatefulWidget {
  final PostModel post;
  final int index;

  const _Post({required this.post, required this.index});

  @override
  ConsumerState<_Post> createState() => _PostState();
}

class _PostState extends ConsumerState<_Post> {
  bool _liked = false;

  @override
  void initState() {
    super.initState();
    _liked = widget.post.isLiked;
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final initials = _initials(post.authorName);
    final avatarColor = _avatarColor(post.authorId);

    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar
            CircleAvatar(
              radius: 20,
              backgroundColor: avatarColor.withOpacity(0.15),
              child: Text(
                initials,
                style: TextStyle(
                  color: avatarColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Content column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name + time
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          post.authorName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            color: Color(0xFF0F1419),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '· ${timeago.format(post.createdAt, locale: 'pt_BR')}',
                        style: const TextStyle(
                          fontSize: 14,
                          color: Color(0xFF536471),
                        ),
                      ),
                      const SizedBox(width: 4),
                      GestureDetector(
                        onTap: () {},
                        child: const Icon(Icons.more_horiz,
                            size: 18, color: Color(0xFF536471)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Post content
                  Text(
                    post.content,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFF0F1419),
                      height: 1.4,
                    ),
                  ),
                  // Media
                  if (post.mediaUrls.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                        post.mediaUrls.first,
                        fit: BoxFit.cover,
                        width: double.infinity,
                        height: 200,
                      ),
                    ),
                  ],
                  // Tags
                  if (post.tags.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: post.tags
                          .take(3)
                          .map((tag) => Text(
                                '#$tag',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Color(0xFF1D9BF0),
                                ),
                              ))
                          .toList(),
                    ),
                  ],
                  const SizedBox(height: 10),
                  // Action bar
                  Row(
                    children: [
                      _ActionBtn(
                        icon: Icons.chat_bubble_outline_rounded,
                        activeIcon: Icons.chat_bubble_rounded,
                        count: post.commentCount,
                        isActive: false,
                        activeColor: const Color(0xFF1D9BF0),
                        onTap: () {},
                      ),
                      const SizedBox(width: 32),
                      _ActionBtn(
                        icon: Icons.repeat_rounded,
                        activeIcon: Icons.repeat_rounded,
                        count: 0,
                        isActive: false,
                        activeColor: const Color(0xFF00BA7C),
                        onTap: () {},
                      ),
                      const SizedBox(width: 32),
                      _ActionBtn(
                        icon: Icons.favorite_outline_rounded,
                        activeIcon: Icons.favorite_rounded,
                        count: post.likeCount + (_liked && !post.isLiked ? 1 : 0),
                        isActive: _liked,
                        activeColor: const Color(0xFFF91880),
                        onTap: () async {
                          setState(() => _liked = !_liked);
                          await ref.read(feedProvider.notifier).likePost(widget.index);
                        },
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: () {},
                        child: const Icon(Icons.ios_share_outlined,
                            size: 18, color: Color(0xFF536471)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts.last[0]}'.toUpperCase();
  }

  Color _avatarColor(String id) {
    final colors = [
      const Color(0xFF1D9BF0),
      const Color(0xFF00BA7C),
      const Color(0xFFF91880),
      const Color(0xFFFF7A00),
      const Color(0xFF7856FF),
      const Color(0xFF0099FF),
    ];
    final hash = id.codeUnits.fold(0, (a, b) => a + b);
    return colors[hash % colors.length];
  }
}

// ─── Action Button ────────────────────────────────────────────────────────────

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final int count;
  final bool isActive;
  final Color activeColor;
  final VoidCallback onTap;

  const _ActionBtn({
    required this.icon,
    required this.activeIcon,
    required this.count,
    required this.isActive,
    required this.activeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Row(
        children: [
          Icon(
            isActive ? activeIcon : icon,
            size: 18,
            color: isActive ? activeColor : const Color(0xFF536471),
          ),
          if (count > 0) ...[
            const SizedBox(width: 4),
            Text(
              _format(count),
              style: TextStyle(
                fontSize: 13,
                color: isActive ? activeColor : const Color(0xFF536471),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _format(int n) {
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
    return '$n';
  }
}
