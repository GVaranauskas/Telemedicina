class PostModel {
  final String postId;
  final String authorId;
  final String authorName;
  final String? authorPicUrl;
  final String content;
  final String postType;
  final List<String> mediaUrls;
  final List<String> tags;
  final int likeCount;
  final int commentCount;
  final DateTime createdAt;
  bool isLiked;
  bool isBookmarked;

  PostModel({
    required this.postId,
    required this.authorId,
    required this.authorName,
    this.authorPicUrl,
    required this.content,
    this.postType = 'TEXT',
    this.mediaUrls = const [],
    this.tags = const [],
    this.likeCount = 0,
    this.commentCount = 0,
    required this.createdAt,
    this.isLiked = false,
    this.isBookmarked = false,
  });

  factory PostModel.fromJson(Map<String, dynamic> json) {
    return PostModel(
      postId: json['post_id'] ?? json['postId'] ?? '',
      authorId: json['author_id'] ?? json['authorId'] ?? '',
      authorName: json['author_name'] ?? json['authorName'] ?? 'Médico',
      authorPicUrl: json['author_pic_url'] ?? json['authorPicUrl'],
      content: json['content'] ?? '',
      postType: json['post_type'] ?? json['postType'] ?? 'TEXT',
      mediaUrls: (json['media_urls'] ?? json['mediaUrls'] as List?)
              ?.cast<String>() ??
          [],
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      likeCount: json['like_count'] ?? json['likeCount'] ?? 0,
      commentCount: json['comment_count'] ?? json['commentCount'] ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : json['createdAt'] != null
              ? DateTime.parse(json['createdAt'].toString())
              : DateTime.now(),
      isLiked: json['is_liked'] ?? json['isLiked'] ?? false,
      isBookmarked: json['is_bookmarked'] ?? json['isBookmarked'] ?? false,
    );
  }
}

class CommentModel {
  final String commentId;
  final String authorId;
  final String authorName;
  final String? authorPicUrl;
  final String content;
  final DateTime createdAt;

  CommentModel({
    required this.commentId,
    required this.authorId,
    required this.authorName,
    this.authorPicUrl,
    required this.content,
    required this.createdAt,
  });

  factory CommentModel.fromJson(Map<String, dynamic> json) {
    return CommentModel(
      commentId: json['comment_id'] ?? json['commentId'] ?? '',
      authorId: json['author_id'] ?? json['authorId'] ?? '',
      authorName: json['author_name'] ?? json['authorName'] ?? 'Médico',
      authorPicUrl: json['author_pic_url'] ?? json['authorPicUrl'],
      content: json['content'] ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : DateTime.now(),
    );
  }
}
