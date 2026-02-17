import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/chat_provider.dart';
import '../../../core/models/chat_model.dart';

class ChatListScreen extends ConsumerStatefulWidget {
  const ChatListScreen({super.key});

  @override
  ConsumerState<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends ConsumerState<ChatListScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(chatListProvider.notifier).loadChats());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mensagens')),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.chats.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.chat_outlined,
                          size: 64, color: AppColors.textSecondary),
                      SizedBox(height: 16),
                      Text('Nenhuma conversa ainda',
                          style: TextStyle(color: AppColors.textSecondary)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () =>
                      ref.read(chatListProvider.notifier).loadChats(),
                  child: ListView.builder(
                    itemCount: state.chats.length,
                    itemBuilder: (context, index) =>
                        _buildChatTile(context, state.chats[index]),
                  ),
                ),
    );
  }

  Widget _buildChatTile(BuildContext context, ChatModel chat) {
    final hasUnread = chat.unreadCount > 0;
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: AppColors.primaryLight,
        backgroundImage: chat.otherUserPicUrl != null
            ? NetworkImage(chat.otherUserPicUrl!)
            : null,
        child: chat.otherUserPicUrl == null
            ? Text(
                chat.otherUserName.isNotEmpty
                    ? chat.otherUserName[0].toUpperCase()
                    : 'D',
                style: TextStyle(color: AppColors.primary),
              )
            : null,
      ),
      title: Text(
        chat.otherUserName,
        style: TextStyle(
          fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      subtitle: Text(
        chat.lastMessage ?? '',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: hasUnread ? AppColors.textPrimary : AppColors.textSecondary,
        ),
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (chat.lastMessageAt != null)
            Text(
              timeago.format(chat.lastMessageAt!, locale: 'pt_BR'),
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          if (hasUnread) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                  color: AppColors.primary, shape: BoxShape.circle),
              child: Text(
                '${chat.unreadCount}',
                style: const TextStyle(color: Colors.white, fontSize: 10),
              ),
            ),
          ],
        ],
      ),
      onTap: () => context.push('/chat/${chat.chatId}', extra: {
        'otherUserName': chat.otherUserName,
        'otherUserId': chat.otherUserId,
      }),
    );
  }
}
