import '../network/api_client.dart';
import '../models/post_model.dart';

class FeedRepository {
  final ApiClient _api;

  FeedRepository(this._api);

  Future<List<PostModel>> getTimeline({int limit = 20, String? before}) async {
    final response = await _api.dio.get('/feed/timeline', queryParameters: {
      'limit': limit,
      if (before != null) 'before': before,
    });
    final list = response.data as List? ?? [];
    return list.map((e) => PostModel.fromJson(e)).toList();
  }

  Future<PostModel> createPost({
    required String content,
    String postType = 'TEXT',
    List<String>? mediaUrls,
    List<String>? tags,
  }) async {
    final response = await _api.dio.post('/feed/posts', data: {
      'content': content,
      'postType': postType,
      if (mediaUrls != null) 'mediaUrls': mediaUrls,
      if (tags != null) 'tags': tags,
    });
    return PostModel.fromJson(response.data);
  }

  Future<void> deletePost(String postId) async {
    await _api.dio.delete('/feed/posts/$postId');
  }

  Future<void> likePost(String postId) async {
    await _api.dio.post('/feed/posts/$postId/like');
  }

  Future<void> unlikePost(String postId) async {
    await _api.dio.delete('/feed/posts/$postId/like');
  }

  Future<List<CommentModel>> getComments(String postId,
      {int limit = 50}) async {
    final response = await _api.dio.get('/feed/posts/$postId/comments',
        queryParameters: {'limit': limit});
    final list = response.data as List? ?? [];
    return list.map((e) => CommentModel.fromJson(e)).toList();
  }

  Future<CommentModel> addComment(String postId, String content) async {
    final response = await _api.dio
        .post('/feed/posts/$postId/comments', data: {'content': content});
    return CommentModel.fromJson(response.data);
  }

  Future<List<PostModel>> getPostsByAuthor(String authorId,
      {int limit = 20}) async {
    final response = await _api.dio.get('/feed/posts/author/$authorId',
        queryParameters: {'limit': limit});
    final list = response.data as List? ?? [];
    return list.map((e) => PostModel.fromJson(e)).toList();
  }
}
