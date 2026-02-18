import '../network/api_client.dart';
import '../models/search_model.dart';

class SearchRepository {
  final ApiClient _api;

  SearchRepository(this._api);

  Future<SearchResult> query(String queryText) async {
    final response = await _api.dio.post('/agentic-search/query', data: {
      'query': queryText,
    });
    return SearchResult.fromJson(response.data);
  }

  Future<RecommendationResult> getRecommendations() async {
    final response = await _api.dio.get('/agentic-search/recommendations');
    return RecommendationResult.fromJson(response.data);
  }
}
