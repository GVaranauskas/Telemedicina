import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { ScyllaService } from '../../database/scylla/scylla.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreatePostDto, CreateCommentDto } from './dto/create-post.dto';
import { EVENTS } from '../../events/events.constants';

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly scylla: ScyllaService,
    private readonly neo4j: Neo4jService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Posts ──────────────────────────────────────────────────

  async createPost(doctorId: string, dto: CreatePostDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { fullName: true, profilePicUrl: true },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const postId = uuidv4();
    const now = new Date();
    const postType = dto.postType || 'TEXT';

    // Insert into post_by_id
    await this.scylla.execute(
      `INSERT INTO post_by_id (post_id, author_id, author_name, author_pic_url, content, post_type, media_urls, tags, likes_count, comments_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [
        postId,
        doctorId,
        doctor.fullName,
        doctor.profilePicUrl || '',
        dto.content,
        postType,
        dto.mediaUrls || [],
        dto.tags || [],
        now,
        now,
      ],
    );

    // Insert into posts_by_author
    await this.scylla.execute(
      `INSERT INTO posts_by_author (author_id, created_at, post_id, content, post_type, media_urls, tags, likes_count, comments_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        doctorId,
        now,
        postId,
        dto.content,
        postType,
        dto.mediaUrls || [],
        dto.tags || [],
      ],
    );

    // Fan-out on write: distribute to connections' feeds
    await this.fanOutPost(doctorId, postId, doctor, dto, now);

    this.eventEmitter.emit(EVENTS.POST_CREATED, {
      postId,
      authorId: doctorId,
    });

    return {
      postId,
      authorId: doctorId,
      authorName: doctor.fullName,
      content: dto.content,
      postType,
      mediaUrls: dto.mediaUrls || [],
      tags: dto.tags || [],
      likesCount: 0,
      commentsCount: 0,
      createdAt: now,
    };
  }

  private async fanOutPost(
    authorId: string,
    postId: string,
    doctor: { fullName: string; profilePicUrl: string | null },
    dto: CreatePostDto,
    createdAt: Date,
  ) {
    try {
      // Get all connections + followers from Neo4j
      const connections = await this.neo4j.read<any>(
        `MATCH (me:Doctor {pgId: $authorId})<-[:CONNECTED_TO|FOLLOWS]-(follower:Doctor)
         RETURN DISTINCT follower.pgId AS followerId`,
        { authorId },
      );

      // Also add author's own feed
      const feedTargets = [
        authorId,
        ...connections.map((c: any) => c.followerId),
      ];

      // Batch insert into feed_by_user for each connection
      const insertPromises = feedTargets.map((userId) =>
        this.scylla.execute(
          `INSERT INTO feed_by_user (user_id, created_at, post_id, author_id, author_name, author_pic_url, content, post_type, media_urls, tags, likes_count, comments_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [
            userId,
            createdAt,
            postId,
            authorId,
            doctor.fullName,
            doctor.profilePicUrl || '',
            dto.content,
            dto.postType || 'TEXT',
            dto.mediaUrls || [],
            dto.tags || [],
          ],
        ).catch((err) =>
          this.logger.error(`Fan-out failed for user ${userId}`, err),
        ),
      );

      await Promise.all(insertPromises);
      this.logger.debug(
        `Post ${postId} fanned out to ${feedTargets.length} feeds`,
      );
    } catch (error) {
      this.logger.error('Fan-out failed', error);
    }
  }

  async getFeed(userId: string, limit = 20, beforeDate?: string) {
    let query = `SELECT * FROM feed_by_user WHERE user_id = ?`;
    const params: any[] = [userId];

    if (beforeDate) {
      query += ` AND created_at < ?`;
      params.push(new Date(beforeDate));
    }

    query += ` LIMIT ?`;
    params.push(limit);

    const result = await this.scylla.execute(query, params);
    const posts = result.rows.map(this.mapPostRow);
    
    // Enrich with actual like/comment counts from post_by_id
    await this.enrichPostCounts(posts);
    return posts;
  }

  async getPostsByAuthor(authorId: string, limit = 20) {
    const result = await this.scylla.execute(
      `SELECT * FROM posts_by_author WHERE author_id = ? LIMIT ?`,
      [authorId, limit],
    );
    const posts = result.rows.map(this.mapPostRow);
    await this.enrichPostCounts(posts);
    return posts;
  }

  private async enrichPostCounts(posts: any[]) {
    for (const post of posts) {
      try {
        const countResult = await this.scylla.execute(
          `SELECT likes_count, comments_count FROM post_by_id WHERE post_id = ?`,
          [post.postId],
        );
        if (countResult.rows.length > 0) {
          post.likesCount = countResult.rows[0].likes_count || 0;
          post.commentsCount = countResult.rows[0].comments_count || 0;
        }
      } catch (_) {}
    }
  }

  async getPostById(postId: string) {
    const result = await this.scylla.execute(
      `SELECT * FROM post_by_id WHERE post_id = ?`,
      [postId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Post not found');
    }

    return this.mapPostRow(result.rows[0]);
  }

  async deletePost(postId: string, authorId: string) {
    const post = await this.getPostById(postId);
    if (post.authorId !== authorId) {
      throw new NotFoundException('Post not found');
    }

    await this.scylla.execute(`DELETE FROM post_by_id WHERE post_id = ?`, [
      postId,
    ]);

    return { message: 'Post deleted' };
  }

  // ─── Likes ──────────────────────────────────────────────────

  async likePost(postId: string, userId: string, userName: string) {
    await this.scylla.execute(
      `INSERT INTO likes_by_post (post_id, user_id, user_name, created_at) VALUES (?, ?, ?, ?)`,
      [postId, userId, userName, new Date()],
    );

    // Count actual likes for accuracy
    const likesResult = await this.scylla.execute(
      `SELECT count(*) as cnt FROM likes_by_post WHERE post_id = ?`,
      [postId],
    );
    const likesCount = Number(likesResult.rows[0]?.cnt ?? 1);

    await this.scylla.execute(
      `UPDATE post_by_id SET likes_count = ? WHERE post_id = ?`,
      [likesCount, postId],
    );

    this.eventEmitter.emit(EVENTS.POST_LIKED, { postId, userId });

    return { message: 'Post liked' };
  }

  async unlikePost(postId: string, userId: string) {
    await this.scylla.execute(
      `DELETE FROM likes_by_post WHERE post_id = ? AND user_id = ?`,
      [postId, userId],
    );

    // Count actual likes for accuracy
    const likesResult = await this.scylla.execute(
      `SELECT count(*) as cnt FROM likes_by_post WHERE post_id = ?`,
      [postId],
    );
    const likesCount = Math.max(0, Number(likesResult.rows[0]?.cnt ?? 0));

    await this.scylla.execute(
      `UPDATE post_by_id SET likes_count = ? WHERE post_id = ?`,
      [likesCount, postId],
    );

    return { message: 'Post unliked' };
  }

  async getPostLikes(postId: string) {
    const result = await this.scylla.execute(
      `SELECT * FROM likes_by_post WHERE post_id = ?`,
      [postId],
    );
    return result.rows.map((row) => ({
      userId: row.user_id,
      userName: row.user_name,
      createdAt: row.created_at,
    }));
  }

  // ─── Comments ───────────────────────────────────────────────

  async addComment(
    postId: string,
    authorId: string,
    authorName: string,
    authorPicUrl: string,
    dto: CreateCommentDto,
  ) {
    const commentId = uuidv4();
    const now = new Date();

    await this.scylla.execute(
      `INSERT INTO comments_by_post (post_id, created_at, comment_id, author_id, author_name, author_pic_url, content)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [postId, now, commentId, authorId, authorName, authorPicUrl, dto.content],
    );

    // Count actual comments for accuracy
    const commentsResult = await this.scylla.execute(
      `SELECT count(*) as cnt FROM comments_by_post WHERE post_id = ?`,
      [postId],
    );
    const commentsCount = Number(commentsResult.rows[0]?.cnt ?? 1);

    await this.scylla.execute(
      `UPDATE post_by_id SET comments_count = ? WHERE post_id = ?`,
      [commentsCount, postId],
    );

    this.eventEmitter.emit(EVENTS.POST_COMMENTED, {
      postId,
      commentId,
      authorId,
    });

    return {
      commentId,
      postId,
      authorId,
      authorName,
      content: dto.content,
      createdAt: now,
    };
  }

  async getComments(postId: string, limit = 50) {
    const result = await this.scylla.execute(
      `SELECT * FROM comments_by_post WHERE post_id = ? LIMIT ?`,
      [postId, limit],
    );
    return result.rows.map((row) => ({
      commentId: row.comment_id,
      postId: row.post_id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorPicUrl: row.author_pic_url,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  private mapPostRow(row: any) {
    return {
      postId: row.post_id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorPicUrl: row.author_pic_url,
      content: row.content,
      postType: row.post_type,
      mediaUrls: row.media_urls || [],
      tags: row.tags ? Array.from(row.tags) : [],
      likesCount: row.likes_count || 0,
      commentsCount: row.comments_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ─── Bookmarks ────────────────────────────────────────────────

  async bookmarkPost(postId: string, userId: string) {
    const now = new Date();
    await this.scylla.execute(
      `INSERT INTO bookmarks_by_user (user_id, bookmarked_at, post_id) VALUES (?, ?, ?)`,
      [userId, now, postId],
    );
    return { status: 'bookmarked' };
  }

  async unbookmarkPost(postId: string, userId: string) {
    // To delete from ScyllaDB we need the full primary key including bookmarked_at
    // First find the bookmark
    const result = await this.scylla.execute(
      `SELECT bookmarked_at FROM bookmarks_by_user WHERE user_id = ? AND post_id = ? ALLOW FILTERING`,
      [userId, postId],
    );
    if (result.rows.length > 0) {
      await this.scylla.execute(
        `DELETE FROM bookmarks_by_user WHERE user_id = ? AND bookmarked_at = ? AND post_id = ?`,
        [userId, result.rows[0].bookmarked_at, postId],
      );
    }
    return { status: 'unbookmarked' };
  }

  async getBookmarks(userId: string, limit = 20) {
    const result = await this.scylla.execute(
      `SELECT post_id FROM bookmarks_by_user WHERE user_id = ? LIMIT ?`,
      [userId, limit],
    );

    const posts: any[] = [];
    for (const row of result.rows) {
      try {
        const post = await this.getPostById(row.post_id);
        if (post) posts.push({ ...post, isBookmarked: true });
      } catch {
        // Post may have been deleted
      }
    }
    return posts;
  }

  async isBookmarked(postId: string, userId: string): Promise<boolean> {
    const result = await this.scylla.execute(
      `SELECT post_id FROM bookmarks_by_user WHERE user_id = ? AND post_id = ? ALLOW FILTERING`,
      [userId, postId],
    );
    return result.rows.length > 0;
  }
}
