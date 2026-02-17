import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/notification_provider.dart';
import '../../../core/models/notification_model.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(notificationProvider.notifier).loadNotifications());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          state.unreadCount > 0
              ? 'Notificações (${state.unreadCount})'
              : 'Notificações',
        ),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.notifications.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none,
                          size: 64, color: AppColors.textSecondary),
                      SizedBox(height: 16),
                      Text('Nenhuma notificação',
                          style: TextStyle(color: AppColors.textSecondary)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => ref
                      .read(notificationProvider.notifier)
                      .loadNotifications(),
                  child: ListView.builder(
                    itemCount: state.notifications.length,
                    itemBuilder: (context, index) => _buildNotificationTile(
                        context, state.notifications[index]),
                  ),
                ),
    );
  }

  Widget _buildNotificationTile(
      BuildContext context, NotificationModel notification) {
    final iconData = _iconForType(notification.type);
    final color = _colorForType(notification.type);
    final isUnread = !notification.isRead;

    return Container(
      color: isUnread ? AppColors.primaryLight.withOpacity(0.08) : null,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.15),
          child: Icon(iconData, color: color, size: 20),
        ),
        title: Text(
          notification.title.isNotEmpty ? notification.title : notification.body,
          style: TextStyle(
            fontWeight: isUnread ? FontWeight.w600 : FontWeight.normal,
            fontSize: 14,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (notification.title.isNotEmpty && notification.body.isNotEmpty)
              Text(notification.body,
                  style: const TextStyle(fontSize: 13),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis),
            Text(
              timeago.format(notification.createdAt, locale: 'pt_BR'),
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        trailing: isUnread
            ? Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                    color: AppColors.primary, shape: BoxShape.circle),
              )
            : null,
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type.toUpperCase()) {
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return Icons.person_add;
      case 'POST_LIKED':
        return Icons.thumb_up;
      case 'POST_COMMENTED':
        return Icons.comment;
      case 'JOB_MATCH':
      case 'JOB_CREATED':
        return Icons.work;
      case 'MESSAGE':
        return Icons.chat;
      default:
        return Icons.notifications;
    }
  }

  Color _colorForType(String type) {
    switch (type.toUpperCase()) {
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return AppColors.primary;
      case 'POST_LIKED':
        return AppColors.accent;
      case 'POST_COMMENTED':
        return AppColors.secondary;
      case 'JOB_MATCH':
      case 'JOB_CREATED':
        return AppColors.warning;
      default:
        return AppColors.primary;
    }
  }
}
