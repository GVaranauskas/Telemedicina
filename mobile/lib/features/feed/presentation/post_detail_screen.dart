import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/models/post_model.dart';
import '../../../core/providers/feed_provider.dart';
import '../../../core/providers/api_provider.dart';

class PostDetailScreen extends ConsumerStatefulWidget {
  final String postId;

  const PostDetailScreen({super.key, required this.postId});

  @override
  ConsumerState<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends ConsumerState<PostDetailScreen> {
  final _commentController = TextEditingController();
  List<CommentModel> _comments = [];
  bool _isLoadingComments = true;
  bool _isSendingComment = false;
  PostModel? _post;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    // Try to find the post in the feed state first
    final feedState = ref.read(feedProvider);
    final match = feedState.posts.where((p) => p.postId == widget.postId);
    if (match.isNotEmpty) {
      _post = match.first;
    } else {
      // Load from API
      try {
        final repo = ref.read(feedRepositoryProvider);
        final post = await repo.getTimeline(); // fallback
        final found = post.where((p) => p.postId == widget.postId);
        if (found.isNotEmpty) _post = found.first;
      } catch (_) {}
    }
    _loadComments();
  }

  Future<void> _loadComments() async {
    setState(() => _isLoadingComments = true);
    try {
      final repo = ref.read(feedRepositoryProvider);
      final comments = await repo.getComments(widget.postId);
      if (mounted) {
        setState(() {
          _comments = comments;
          _isLoadingComments = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingComments = false);
    }
  }

  Future<void> _sendComment() async {
    final content = _commentController.text.trim();
    if (content.isEmpty) return;

    setState(() => _isSendingComment = true);
    try {
      final repo = ref.read(feedRepositoryProvider);
      final comment = await repo.addComment(widget.postId, content);
      if (mounted) {
        setState(() {
          _comments.insert(0, comment);
          _isSendingComment = false;
        });
        _commentController.clear();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSendingComment = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Erro ao enviar comentario')),
        );
      }
    }
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Post'),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadComments,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Post content
                  if (_post != null) _buildPostContent(_post!),
                  const Divider(height: 32),
                  // Comments header
                  Text(
                    'Comentarios (${_comments.length})',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: Color(0xFF0F1419),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Comments list
                  if (_isLoadingComments)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  else if (_comments.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: Text(
                          'Nenhum comentario ainda.\nSeja o primeiro!',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color(0xFF536471),
                            fontSize: 14,
                          ),
                        ),
                      ),
                    )
                  else
                    ..._comments.map((c) => _buildComment(c)),
                ],
              ),
            ),
          ),
          // Comment input
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      decoration: InputDecoration(
                        hintText: 'Escreva um comentario...',
                        hintStyle: const TextStyle(
                            color: Color(0xFF536471), fontSize: 14),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF7F9F9),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                      ),
                      maxLines: null,
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: const Color(0xFF1D9BF0),
                    radius: 20,
                    child: _isSendingComment
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : IconButton(
                            icon: const Icon(Icons.send,
                                color: Colors.white, size: 18),
                            onPressed: _sendComment,
                            padding: EdgeInsets.zero,
                          ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPostContent(PostModel post) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Author row
        Row(
          children: [
            GestureDetector(
              onTap: () => context.push('/doctor/${post.authorId}'),
              child: CircleAvatar(
                radius: 24,
                backgroundColor: const Color(0xFF1D9BF0).withOpacity(0.15),
                child: Text(
                  post.authorName.isNotEmpty
                      ? post.authorName[0].toUpperCase()
                      : '?',
                  style: const TextStyle(
                    color: Color(0xFF1D9BF0),
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GestureDetector(
                    onTap: () => context.push('/doctor/${post.authorId}'),
                    child: Text(
                      post.authorName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        color: Color(0xFF0F1419),
                      ),
                    ),
                  ),
                  Text(
                    timeago.format(post.createdAt, locale: 'pt_BR'),
                    style: const TextStyle(
                        color: Color(0xFF536471), fontSize: 13),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Content
        Text(
          post.content,
          style: const TextStyle(
            fontSize: 16,
            color: Color(0xFF0F1419),
            height: 1.5,
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
                .map((tag) => Text('#$tag',
                    style: const TextStyle(
                        fontSize: 14, color: Color(0xFF1D9BF0))))
                .toList(),
          ),
        ],
        const SizedBox(height: 12),
        // Stats row
        Row(
          children: [
            Icon(Icons.favorite_rounded,
                size: 16, color: const Color(0xFFF91880)),
            const SizedBox(width: 4),
            Text('${post.likeCount}',
                style: const TextStyle(
                    color: Color(0xFF536471), fontSize: 13)),
            const SizedBox(width: 16),
            Icon(Icons.chat_bubble_rounded,
                size: 16, color: const Color(0xFF1D9BF0)),
            const SizedBox(width: 4),
            Text('${post.commentCount}',
                style: const TextStyle(
                    color: Color(0xFF536471), fontSize: 13)),
          ],
        ),
      ],
    );
  }

  Widget _buildComment(CommentModel comment) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => context.push('/doctor/${comment.authorId}'),
            child: CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFF00BA7C).withOpacity(0.15),
              child: Text(
                comment.authorName.isNotEmpty
                    ? comment.authorName[0].toUpperCase()
                    : '?',
                style: const TextStyle(
                  color: Color(0xFF00BA7C),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F9F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          comment.authorName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                            color: Color(0xFF0F1419),
                          ),
                        ),
                      ),
                      Text(
                        timeago.format(comment.createdAt, locale: 'pt_BR'),
                        style: const TextStyle(
                            color: Color(0xFF536471), fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    comment.content,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF0F1419),
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
