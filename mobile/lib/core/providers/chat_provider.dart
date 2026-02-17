import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/chat_model.dart';
import '../repositories/chat_repository.dart';
import 'api_provider.dart';

// ─── State ────────────────────────────────────────────────────
class ChatListState {
  final List<ChatModel> chats;
  final bool isLoading;
  final String? error;

  const ChatListState({
    this.chats = const [],
    this.isLoading = false,
    this.error,
  });

  ChatListState copyWith({
    List<ChatModel>? chats,
    bool? isLoading,
    String? error,
  }) {
    return ChatListState(
      chats: chats ?? this.chats,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────
class ChatListNotifier extends StateNotifier<ChatListState> {
  final ChatRepository _repo;

  ChatListNotifier(this._repo) : super(const ChatListState());

  Future<void> loadChats() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final chats = await _repo.getConversations();
      state = state.copyWith(chats: chats, isLoading: false);
    } catch (e) {
      state = state.copyWith(
          isLoading: false, error: 'Erro ao carregar mensagens');
    }
  }
}

// ─── Provider ─────────────────────────────────────────────────
final chatListProvider =
    StateNotifierProvider<ChatListNotifier, ChatListState>((ref) {
  return ChatListNotifier(ref.watch(chatRepositoryProvider));
});
