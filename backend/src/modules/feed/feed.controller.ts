import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { CreatePostDto, CreateCommentDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma/prisma.service';

@ApiTags('Feed')
@Controller('feed')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Posts ──────────────────────────────────────────────────

  @Post('posts')
  @ApiOperation({ summary: 'Create a new post' })
  async createPost(
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.feedService.createPost(doctorId, dto);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get my feed timeline' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, description: 'ISO date for pagination' })
  async getTimeline(
    @CurrentUser('doctorId') doctorId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    return this.feedService.getFeed(
      doctorId,
      limit ? Number(limit) : 20,
      before,
    );
  }

  @Get('posts/author/:authorId')
  @ApiOperation({ summary: 'Get posts by a specific doctor' })
  async getPostsByAuthor(
    @Param('authorId') authorId: string,
    @Query('limit') limit?: number,
  ) {
    return this.feedService.getPostsByAuthor(
      authorId,
      limit ? Number(limit) : 20,
    );
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: 'Get a single post by ID' })
  async getPost(@Param('postId') postId: string) {
    return this.feedService.getPostById(postId);
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: 'Delete my post' })
  async deletePost(
    @CurrentUser('doctorId') doctorId: string,
    @Param('postId') postId: string,
  ) {
    return this.feedService.deletePost(postId, doctorId);
  }

  // ─── Likes ──────────────────────────────────────────────────

  @Post('posts/:postId/like')
  @ApiOperation({ summary: 'Like a post' })
  async likePost(
    @CurrentUser('doctorId') doctorId: string,
    @Param('postId') postId: string,
  ) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { fullName: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return this.feedService.likePost(postId, doctorId, doctor.fullName);
  }

  @Delete('posts/:postId/like')
  @ApiOperation({ summary: 'Unlike a post' })
  async unlikePost(
    @CurrentUser('doctorId') doctorId: string,
    @Param('postId') postId: string,
  ) {
    return this.feedService.unlikePost(postId, doctorId);
  }

  @Get('posts/:postId/likes')
  @ApiOperation({ summary: 'Get likes for a post' })
  async getPostLikes(@Param('postId') postId: string) {
    return this.feedService.getPostLikes(postId);
  }

  // ─── Comments ───────────────────────────────────────────────

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Add comment to a post' })
  async addComment(
    @CurrentUser('doctorId') doctorId: string,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { fullName: true, profilePicUrl: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return this.feedService.addComment(
      postId,
      doctorId,
      doctor.fullName,
      doctor.profilePicUrl || '',
      dto,
    );
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  async getComments(
    @Param('postId') postId: string,
    @Query('limit') limit?: number,
  ) {
    return this.feedService.getComments(postId, limit ? Number(limit) : 50);
  }

  // ─── Bookmarks ────────────────────────────────────────────────

  @Post('posts/:postId/bookmark')
  @ApiOperation({ summary: 'Bookmark a post' })
  async bookmarkPost(
    @CurrentUser('doctorId') doctorId: string,
    @Param('postId') postId: string,
  ) {
    return this.feedService.bookmarkPost(postId, doctorId);
  }

  @Delete('posts/:postId/bookmark')
  @ApiOperation({ summary: 'Remove bookmark from a post' })
  async unbookmarkPost(
    @CurrentUser('doctorId') doctorId: string,
    @Param('postId') postId: string,
  ) {
    return this.feedService.unbookmarkPost(postId, doctorId);
  }

  @Get('bookmarks')
  @ApiOperation({ summary: 'Get my bookmarked posts' })
  async getBookmarks(
    @CurrentUser('doctorId') doctorId: string,
    @Query('limit') limit?: number,
  ) {
    return this.feedService.getBookmarks(doctorId, limit ? Number(limit) : 20);
  }
}
