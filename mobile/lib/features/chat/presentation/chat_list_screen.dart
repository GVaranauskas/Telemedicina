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
      backgroundColor: AppColors.background,
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.chats.isEmpty
              ? _buildEmptyState()
              : _buildChatList(state),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.chat_outlined,
              size: 40,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Nenhuma conversa',
            style: AppTextStyles.headingSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Suas mensagens aparecerão aqui',
            style: AppTextStyles.bodySmall,
          ),
        ],
      ),
    );
  }

  Widget _buildChatList(dynamic state) {
    return RefreshIndicator(
      onRefresh: () => ref.read(chatListProvider.notifier).loadChats(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: state.chats.length,
        itemBuilder: (context, index) => _buildChatTile(state.chats[index]),
      ),
    );
  }

  Widget _buildChatTile(ChatModel chat) {
    final hasUnread = chat.unreadCount > 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: AppColors.primaryLight,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Center(
            child: Text(
              chat.otherUserName.isNotEmpty
                  ? chat.otherUserName[0].toUpperCase()
                  : '?',
              style: AppTextStyles.titleLarge.copyWith(color: AppColors.primary),
            ),
          ),
        ),
        title: Text(
          chat.otherUserName,
          style: AppTextStyles.titleMedium.copyWith(
            fontWeight: hasUnread ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
        subtitle: Text(
          chat.lastMessage ?? '',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: hasUnread
              ? AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w500,
                )
              : AppTextStyles.bodySmall,
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (chat.lastMessageAt != null)
              Text(
                timeago.format(chat.lastMessageAt!, locale: 'pt_BR'),
                style: AppTextStyles.caption,
              ),
            if (hasUnread) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${chat.unreadCount}',
                  style: AppTextStyles.labelSmall.copyWith(
                    color: AppColors.textInverse,
                  ),
                ),
              ),
            ],
          ],
        ),
        onTap: () => context.push('/chat/${chat.chatId}', extra: {
          'otherUserName': chat.otherUserName,
          'otherUserId': chat.otherUserId,
        }),
      ),
    );
  }
}