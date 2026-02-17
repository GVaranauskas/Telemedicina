import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { ScyllaService } from '../../database/scylla/scylla.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EVENTS } from '../../events/events.constants';

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly scylla: ScyllaService,
    private readonly prisma: PrismaService,
  ) {}

  async createNotification(dto: CreateNotificationDto) {
    const notificationId = uuidv4();
    const now = new Date();

    await this.scylla.execute(
      `INSERT INTO notifications_by_user (user_id, created_at, notification_id, type, title, body, data, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, false)`,
      [
        dto.userId,
        now,
        notificationId,
        dto.type,
        dto.title,
        dto.body,
        dto.data ? JSON.stringify(dto.data) : null,
      ],
    );

    return {
      notificationId,
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      isRead: false,
      createdAt: now,
    };
  }

  async getNotifications(userId: string, limit = 30) {
    const result = await this.scylla.execute(
      `SELECT * FROM notifications_by_user WHERE user_id = ? LIMIT ?`,
      [userId, limit],
    );

    return result.rows.map((row) => ({
      notificationId: row.notification_id,
      type: row.type,
      title: row.title,
      body: row.body,
      data: row.data ? JSON.parse(row.data) : null,
      isRead: row.is_read,
      createdAt: row.created_at,
    }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.scylla.execute(
      `SELECT COUNT(*) as count FROM notifications_by_user WHERE user_id = ? AND is_read = false ALLOW FILTERING`,
      [userId],
    );
    return Number(result.rows[0]?.count || 0);
  }

  // ─── Event-driven notifications ─────────────────────────────

  @OnEvent(EVENTS.CONNECTION_CREATED)
  async handleConnectionCreated(payload: {
    senderId: string;
    receiverId: string;
  }) {
    await this.createNotification({
      userId: payload.receiverId,
      type: 'CONNECTION_ACCEPTED',
      title: 'Nova conexão',
      body: 'Sua conexão foi aceita!',
      data: { doctorId: payload.senderId },
    });
  }

  @OnEvent(EVENTS.POST_LIKED)
  async handlePostLiked(payload: { postId: string; userId: string }) {
    try {
      // Look up the post author from ScyllaDB
      const postResult = await this.scylla.execute(
        `SELECT author_id FROM post_by_id WHERE post_id = ?`,
        [payload.postId],
      );

      if (postResult.rows.length === 0) return;

      const authorId = postResult.rows[0].author_id;

      // Don't notify if the user liked their own post
      if (authorId === payload.userId) return;

      // Look up the liker's name from Prisma
      const liker = await this.prisma.doctor.findUnique({
        where: { id: payload.userId },
        select: { fullName: true },
      });

      await this.createNotification({
        userId: authorId,
        type: 'POST_LIKED',
        title: 'Novo like',
        body: `${liker?.fullName || 'Alguém'} curtiu sua publicação.`,
        data: { postId: payload.postId, likerId: payload.userId },
      });
    } catch (error) {
      this.logger.error('Failed to create POST_LIKED notification', error);
    }
  }

  @OnEvent(EVENTS.POST_COMMENTED)
  async handlePostCommented(payload: {
    postId: string;
    commentId: string;
    authorId: string;
  }) {
    try {
      // Look up the post author from ScyllaDB
      const postResult = await this.scylla.execute(
        `SELECT author_id FROM post_by_id WHERE post_id = ?`,
        [payload.postId],
      );

      if (postResult.rows.length === 0) return;

      const postAuthorId = postResult.rows[0].author_id;

      // Don't notify if the user commented on their own post
      if (postAuthorId === payload.authorId) return;

      // Look up the commenter's name from Prisma
      const commenter = await this.prisma.doctor.findUnique({
        where: { id: payload.authorId },
        select: { fullName: true },
      });

      await this.createNotification({
        userId: postAuthorId,
        type: 'POST_COMMENTED',
        title: 'Novo comentário',
        body: `${commenter?.fullName || 'Alguém'} comentou na sua publicação.`,
        data: {
          postId: payload.postId,
          commentId: payload.commentId,
          commenterId: payload.authorId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create POST_COMMENTED notification', error);
    }
  }

  @OnEvent(EVENTS.JOB_CREATED)
  async handleJobCreated(payload: {
    id: string;
    title: string;
    city: string;
  }) {
    try {
      // Find doctors in the same city to notify about the new job
      const doctors = await this.prisma.doctor.findMany({
        where: { city: payload.city },
        select: { id: true },
      });

      if (doctors.length === 0) return;

      const notificationPromises = doctors.map((doctor) =>
        this.createNotification({
          userId: doctor.id,
          type: 'JOB_CREATED',
          title: 'Nova vaga disponível',
          body: `Nova vaga: ${payload.title} em ${payload.city}.`,
          data: { jobId: payload.id },
        }).catch((err) =>
          this.logger.error(
            `Failed to notify doctor ${doctor.id} about job ${payload.id}`,
            err,
          ),
        ),
      );

      await Promise.all(notificationPromises);
      this.logger.debug(
        `Notified ${doctors.length} doctors about job ${payload.id}`,
      );
    } catch (error) {
      this.logger.error('Failed to create JOB_CREATED notifications', error);
    }
  }
}
