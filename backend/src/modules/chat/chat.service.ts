import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ScyllaService } from '../../database/scylla/scylla.service';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly scylla: ScyllaService,
    private readonly prisma: PrismaService,
  ) {}

  async sendMessage(payload: {
    chatId: string;
    senderId: string;
    receiverId: string;
    content: string;
    messageType: string;
    mediaUrl?: string;
  }) {
    const messageId = uuidv4();
    const now = new Date();

    // Ensure chatId is consistent (sorted user IDs)
    const chatId =
      payload.chatId || this.getChatId(payload.senderId, payload.receiverId);

    // Fetch both doctors' details in parallel
    const [sender, receiver] = await Promise.all([
      this.prisma.doctor.findUnique({
        where: { id: payload.senderId },
        select: { fullName: true, profilePicUrl: true },
      }),
      this.prisma.doctor.findUnique({
        where: { id: payload.receiverId },
        select: { fullName: true, profilePicUrl: true },
      }),
    ]);

    const senderName = sender?.fullName || '';
    const senderPicUrl = sender?.profilePicUrl || '';
    const receiverName = receiver?.fullName || '';
    const receiverPicUrl = receiver?.profilePicUrl || '';

    // Store message
    await this.scylla.execute(
      `INSERT INTO messages_by_chat (chat_id, sent_at, message_id, sender_id, content, message_type, media_url, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, false)`,
      [
        chatId,
        now,
        messageId,
        payload.senderId,
        payload.content,
        payload.messageType,
        payload.mediaUrl || null,
      ],
    );

    // Update chats_by_user for sender (other user = receiver)
    await this.scylla.execute(
      `INSERT INTO chats_by_user (user_id, last_message_at, chat_id, other_user_id, other_user_name, other_user_pic_url, last_message_preview, unread_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        payload.senderId,
        now,
        chatId,
        payload.receiverId,
        receiverName,
        receiverPicUrl,
        payload.content.substring(0, 100),
      ],
    );

    // Update chats_by_user for receiver (other user = sender)
    await this.scylla.execute(
      `INSERT INTO chats_by_user (user_id, last_message_at, chat_id, other_user_id, other_user_name, other_user_pic_url, last_message_preview, unread_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        payload.receiverId,
        now,
        chatId,
        payload.senderId,
        senderName,
        senderPicUrl,
        payload.content.substring(0, 100),
      ],
    );

    return {
      messageId,
      chatId,
      senderId: payload.senderId,
      content: payload.content,
      messageType: payload.messageType,
      mediaUrl: payload.mediaUrl,
      sentAt: now,
      isRead: false,
    };
  }

  async getMessages(chatId: string, limit = 50, beforeDate?: string) {
    let query = `SELECT * FROM messages_by_chat WHERE chat_id = ?`;
    const params: any[] = [chatId];

    if (beforeDate) {
      query += ` AND sent_at < ?`;
      params.push(new Date(beforeDate));
    }

    query += ` LIMIT ?`;
    params.push(limit);

    const result = await this.scylla.execute(query, params);
    return result.rows.map((row) => ({
      messageId: row.message_id,
      chatId: row.chat_id,
      senderId: row.sender_id,
      content: row.content,
      messageType: row.message_type,
      mediaUrl: row.media_url,
      isRead: row.is_read,
      sentAt: row.sent_at,
    }));
  }

  async getChats(userId: string, limit = 20) {
    const result = await this.scylla.execute(
      `SELECT * FROM chats_by_user WHERE user_id = ? LIMIT ?`,
      [userId, limit],
    );

    return result.rows.map((row) => ({
      chatId: row.chat_id,
      otherUserId: row.other_user_id,
      otherUserName: row.other_user_name,
      otherUserPicUrl: row.other_user_pic_url,
      lastMessagePreview: row.last_message_preview,
      lastMessageAt: row.last_message_at,
      unreadCount: row.unread_count,
    }));
  }

  async markAsRead(chatId: string, messageId: string) {
    // Note: ScyllaDB doesn't support UPDATE with complex WHERE on clustering keys
    // In production, you'd handle this differently
    this.logger.debug(`Marking message ${messageId} in chat ${chatId} as read`);
  }

  getChatId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join(':');
  }
}
