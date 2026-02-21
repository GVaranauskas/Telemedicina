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
              ?.whereType<Map>()
              .map((e) => SearchResultItem.fromJson(Map<String, dynamic>.from(e)))
              .toList() ??
          [],
      toolsUsed: (json['toolsUsed'] as List?)
          ?.whereType<String>()
          .toList(),
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
    final rawData = json['data'];
    return SearchResultItem(
      type: json['type'] ?? 'unknown',
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? json['name'] ?? '',
      subtitle: json['subtitle'] ?? json['description'],
      data: rawData is Map<String, dynamic>
          ? rawData
          : rawData is Map
              ? Map<String, dynamic>.from(rawData)
              : null,
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
