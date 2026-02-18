class SearchResult {
  final String answer;
  final List<SearchResultItem> results;
  final List<String>? toolsUsed;

  SearchResult({
    required this.answer,
    this.results = const [],
    this.toolsUsed,
  });

  factory SearchResult.fromJson(Map<String, dynamic> json) {
    return SearchResult(
      answer: json['answer'] ?? json['response'] ?? '',
      results: (json['results'] as List?)
              ?.map((e) => SearchResultItem.fromJson(e))
              .toList() ??
          [],
      toolsUsed: (json['toolsUsed'] as List?)?.cast<String>(),
    );
  }
}

class SearchResultItem {
  final String type;
  final String id;
  final String title;
  final String? subtitle;
  final Map<String, dynamic>? data;

  SearchResultItem({
    required this.type,
    required this.id,
    required this.title,
    this.subtitle,
    this.data,
  });

  factory SearchResultItem.fromJson(Map<String, dynamic> json) {
    return SearchResultItem(
      type: json['type'] ?? 'unknown',
      id: json['id'] ?? '',
      title: json['title'] ?? json['name'] ?? '',
      subtitle: json['subtitle'] ?? json['description'],
      data: json['data'] ?? json,
    );
  }
}

class RecommendationResult {
  final List<dynamic> connections;
  final List<dynamic> jobs;
  final List<dynamic> learningPaths;

  RecommendationResult({
    this.connections = const [],
    this.jobs = const [],
    this.learningPaths = const [],
  });

  factory RecommendationResult.fromJson(Map<String, dynamic> json) {
    return RecommendationResult(
      connections: json['connections'] ?? [],
      jobs: json['jobs'] ?? [],
      learningPaths: json['learningPaths'] ?? [],
    );
  }
}
