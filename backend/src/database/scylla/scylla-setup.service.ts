import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ScyllaService } from './scylla.service';

@Injectable()
export class ScyllaSetupService implements OnModuleInit {
  private readonly logger = new Logger(ScyllaSetupService.name);

  constructor(private readonly scylla: ScyllaService) {}

  async onModuleInit() {
    try {
      await this.scylla.initKeyspace();
      await this.createTables();
      this.logger.log('ScyllaDB schema initialized');
    } catch (error) {
      this.logger.warn(
        'ScyllaDB setup deferred (connection not ready)',
        error.message,
      );
    }
  }

  private async createTables() {
    const tables = [
      // Posts by author (for profile page)
      `CREATE TABLE IF NOT EXISTS posts_by_author (
        author_id text,
        created_at timestamp,
        post_id text,
        content text,
        post_type text,
        media_urls list<text>,
        tags set<text>,
        likes_count int,
        comments_count int,
        PRIMARY KEY (author_id, created_at, post_id)
      ) WITH CLUSTERING ORDER BY (created_at DESC, post_id ASC)`,

      // Feed by user (fan-out on write)
      `CREATE TABLE IF NOT EXISTS feed_by_user (
        user_id text,
        created_at timestamp,
        post_id text,
        author_id text,
        author_name text,
        author_pic_url text,
        content text,
        post_type text,
        media_urls list<text>,
        tags set<text>,
        likes_count int,
        comments_count int,
        PRIMARY KEY (user_id, created_at, post_id)
      ) WITH CLUSTERING ORDER BY (created_at DESC, post_id ASC)`,

      // Post by ID (for direct lookups)
      `CREATE TABLE IF NOT EXISTS post_by_id (
        post_id text PRIMARY KEY,
        author_id text,
        author_name text,
        author_pic_url text,
        content text,
        post_type text,
        media_urls list<text>,
        tags set<text>,
        likes_count int,
        comments_count int,
        created_at timestamp,
        updated_at timestamp
      )`,

      // Comments
      `CREATE TABLE IF NOT EXISTS comments_by_post (
        post_id text,
        created_at timestamp,
        comment_id text,
        author_id text,
        author_name text,
        author_pic_url text,
        content text,
        PRIMARY KEY (post_id, created_at, comment_id)
      ) WITH CLUSTERING ORDER BY (created_at ASC, comment_id ASC)`,

      // Likes
      `CREATE TABLE IF NOT EXISTS likes_by_post (
        post_id text,
        user_id text,
        user_name text,
        created_at timestamp,
        PRIMARY KEY (post_id, user_id)
      )`,

      // Chat messages
      `CREATE TABLE IF NOT EXISTS messages_by_chat (
        chat_id text,
        sent_at timestamp,
        message_id text,
        sender_id text,
        content text,
        message_type text,
        media_url text,
        is_read boolean,
        PRIMARY KEY (chat_id, sent_at, message_id)
      ) WITH CLUSTERING ORDER BY (sent_at DESC, message_id ASC)`,

      // Chats by user
      `CREATE TABLE IF NOT EXISTS chats_by_user (
        user_id text,
        last_message_at timestamp,
        chat_id text,
        other_user_id text,
        other_user_name text,
        other_user_pic_url text,
        last_message_preview text,
        unread_count int,
        PRIMARY KEY (user_id, last_message_at, chat_id)
      ) WITH CLUSTERING ORDER BY (last_message_at DESC, chat_id ASC)`,

      // Bookmarks
      `CREATE TABLE IF NOT EXISTS bookmarks_by_user (
        user_id text,
        bookmarked_at timestamp,
        post_id text,
        PRIMARY KEY (user_id, bookmarked_at, post_id)
      ) WITH CLUSTERING ORDER BY (bookmarked_at DESC, post_id ASC)`,

      // Notifications
      `CREATE TABLE IF NOT EXISTS notifications_by_user (
        user_id text,
        created_at timestamp,
        notification_id text,
        type text,
        title text,
        body text,
        data text,
        is_read boolean,
        PRIMARY KEY (user_id, created_at, notification_id)
      ) WITH CLUSTERING ORDER BY (created_at DESC, notification_id ASC)`,
    ];

    for (const table of tables) {
      try {
        await this.scylla.execute(table);
      } catch (error) {
        this.logger.error(`Failed to create table: ${error.message}`);
      }
    }
  }
}
