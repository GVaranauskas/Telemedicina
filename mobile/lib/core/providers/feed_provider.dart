import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/post_model.dart';
import '../repositories/feed_repository.dart';
import 'api_provider.dart';

// ─── Feed State ───────────────────────────────────────────────
class FeedState {
  final List<PostModel> posts;
  final bool isLoading;
  final bool isCreating;
  final String? error;

  const FeedState({
    this.posts = const [],
    this.isLoading = false,
    this.isCreating = false,
    this.error,
  });

  FeedState copyWith({
    List<PostModel>? posts,
    bool? isLoading,
    bool? isCreating,
    String? error,
  }) {
    return FeedState(
      posts: posts ?? this.posts,
      isLoading: isLoading ?? this.isLoading,
      isCreating: isCreating ?? this.isCreating,
      error: error,
    );
  }
}

// ─── Feed Notifier ────────────────────────────────────────────
class FeedNotifier extends StateNotifier<FeedState> {
  final FeedRepository _repo;

  FeedNotifier(this._repo) : super(const FeedState());

  Future<void> loadFeed() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final posts = await _repo.getTimeline();
      state = state.copyWith(posts: posts, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Erro ao carregar feed');
    }
  }

  Future<void> refresh() async {
    try {
      final posts = await _repo.getTimeline();
      state = state.copyWith(posts: posts);
    } catch (_) {}
  }

  Future<bool> createPost(String content, {List<String>? tags}) async {
    state = state.copyWith(isCreating: true);
    try {
      await _repo.createPost(content: content, tags: tags);
      state = state.copyWith(isCreating: false);
      await refresh();
      return true;
    } catch (e) {
      state = state.copyWith(isCreating: false, error: 'Erro ao criar post');
      return false;
    }
  }

  Future<void> likePost(int index) async {
    if (index >= state.posts.length) return;
    final post = state.posts[index];
    try {
      if (post.isLiked) {
        await _repo.unlikePost(post.postId);
      } else {
        await _repo.likePost(post.postId);
      }
      // Optimistic update
      final updated = List<PostModel>.from(state.posts);
      updated[index].isLiked = !post.isLiked;
      state = state.copyWith(posts: updated);
    } catch (_) {}
  }

  Future<void> deletePost(String postId) async {
    try {
      await _repo.deletePost(postId);
      final updated = state.posts.where((p) => p.postId != postId).toList();
      state = state.copyWith(posts: updated);
    } catch (_) {}
  }
}

// ─── Provider ─────────────────────────────────────────────────
final feedProvider = StateNotifierProvider<FeedNotifier, FeedState>((ref) {
  return FeedNotifier(ref.watch(feedRepositoryProvider));
});
