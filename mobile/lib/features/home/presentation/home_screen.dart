import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/feed_provider.dart';
import '../../feed/presentation/feed_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Sticky header
            _StickyHeader(),
            const Divider(height: 1, color: Color(0xFFEFF3F4)),
            // Compose box
            _ComposeBox(),
            const Divider(height: 1, color: Color(0xFFEFF3F4)),
            // Feed
            const Expanded(child: FeedScreen()),
          ],
        ),
      ),
    );
  }
}

// ─── Sticky Header ────────────────────────────────────────────────────────────

class _StickyHeader extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          const Text(
            'Feed',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F1419),
            ),
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.notifications_outlined,
                color: Color(0xFF536471)),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
    );
  }
}

// ─── Compose Box ─────────────────────────────────────────────────────────────

class _ComposeBox extends ConsumerStatefulWidget {
  @override
  ConsumerState<_ComposeBox> createState() => _ComposeBoxState();
}

class _ComposeBoxState extends ConsumerState<_ComposeBox> {
  final _controller = TextEditingController();
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      final hasText = _controller.text.trim().isNotEmpty;
      if (hasText != _hasText) setState(() => _hasText = hasText);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _publish() async {
    final content = _controller.text.trim();
    if (content.isEmpty) return;

    final ok = await ref.read(feedProvider.notifier).createPost(content);
    if (ok && mounted) {
      _controller.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final isCreating = ref.watch(feedProvider).isCreating;
    final initials = _initials(user?.fullName ?? '');

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: const Color(0xFFE8F5E9),
            child: Text(
              initials,
              style: const TextStyle(
                color: Color(0xFF1B5E20),
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                TextField(
                  controller: _controller,
                  maxLines: null,
                  minLines: 1,
                  style: const TextStyle(
                    fontSize: 18,
                    color: Color(0xFF0F1419),
                  ),
                  decoration: const InputDecoration(
                    hintText: 'O que está acontecendo?',
                    hintStyle: TextStyle(
                      fontSize: 18,
                      color: Color(0xFF536471),
                    ),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Attachment icons
                    Row(
                      children: [
                        _attachIcon(Icons.image_outlined),
                        _attachIcon(Icons.gif_box_outlined),
                        _attachIcon(Icons.poll_outlined),
                        _attachIcon(Icons.emoji_emotions_outlined),
                      ],
                    ),
                    // Publish button
                    FilledButton(
                      onPressed: _hasText && !isCreating ? _publish : null,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF1D9BF0),
                        disabledBackgroundColor: const Color(0xFF1D9BF0).withOpacity(0.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 18, vertical: 8),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: isCreating
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Publicar',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                            ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _attachIcon(IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: IconButton(
        icon: Icon(icon, size: 20, color: const Color(0xFF1D9BF0)),
        onPressed: () {},
        constraints: const BoxConstraints(),
        padding: const EdgeInsets.all(6),
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts.last[0]}'.toUpperCase();
  }
}
