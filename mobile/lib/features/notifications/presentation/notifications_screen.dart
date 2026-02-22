import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/notification_provider.dart';
import '../../../core/models/notification_model.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(notificationProvider.notifier).loadNotifications());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.notifications.isEmpty
              ? _buildEmptyState()
              : _buildNotificationsList(state),
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
              Icons.notifications_none,
              size: 40,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Sem notificações',
            style: AppTextStyles.headingSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Você não tem notificações no momento',
            style: AppTextStyles.bodySmall,
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationsList(dynamic state) {
    return RefreshIndicator(
      onRefresh: () => ref.read(notificationProvider.notifier).loadNotifications(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: state.notifications.length,
        itemBuilder: (context, index) => _buildNotificationTile(state.notifications[index], index),
      ),
    );
  }

  void _onNotificationTap(NotificationModel notification, int index) {
    ref.read(notificationProvider.notifier).markAsRead(index);

    final data = notification.data;
    switch (notification.type) {
      case 'POST_LIKED':
      case 'POST_COMMENTED':
        final postId = data?['postId'];
        if (postId != null) context.push('/post/$postId');
        break;
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        final doctorId = data?['doctorId'] ?? data?['senderId'];
        if (doctorId != null) context.push('/doctor/$doctorId');
        break;
      case 'MESSAGE':
        final chatId = data?['chatId'];
        if (chatId != null) {
          context.push('/chat/$chatId', extra: {
            'otherUserName': notification.title,
            'otherUserId': data?['senderId'] ?? '',
          });
        }
        break;
      case 'JOB_CREATED':
        context.go('/jobs');
        break;
    }
  }

  Widget _buildNotificationTile(NotificationModel notification, int index) {
    final iconData = _iconForType(notification.type);
    final color = _colorForType(notification.type);
    final isUnread = !notification.isRead;

    return GestureDetector(
      onTap: () => _onNotificationTap(notification, index),
      child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isUnread ? AppColors.primaryLight.withAlpha(30) : AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isUnread ? AppColors.primary.withAlpha(50) : AppColors.border,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withAlpha(30),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(iconData, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notification.title.isNotEmpty ? notification.title : notification.body,
                  style: AppTextStyles.titleMedium.copyWith(
                    fontWeight: isUnread ? FontWeight.w700 : FontWeight.w600,
                  ),
                ),
                if (notification.title.isNotEmpty && notification.body.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    notification.body,
                    style: AppTextStyles.bodySmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  timeago.format(notification.createdAt, locale: 'pt_BR'),
                  style: AppTextStyles.caption,
                ),
              ],
            ),
          ),
          if (isUnread)
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
            ),
        ],
      ),
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'CONNECTION_REQUEST':
        return Icons.person_add;
      case 'CONNECTION_ACCEPTED':
        return Icons.check_circle;
      case 'LIKE':
        return Icons.favorite;
      case 'COMMENT':
        return Icons.comment;
      case 'MESSAGE':
        return Icons.chat;
      case 'JOB_APPLICATION':
        return Icons.work;
      default:
        return Icons.notifications;
    }
  }

  Color _colorForType(String type) {
    switch (type) {
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return AppColors.primary;
      case 'LIKE':
        return AppColors.error;
      case 'COMMENT':
      case 'MESSAGE':
        return AppColors.secondary;
      case 'JOB_APPLICATION':
        return AppColors.success;
      default:
        return AppColors.textSecondary;
    }
  }
}