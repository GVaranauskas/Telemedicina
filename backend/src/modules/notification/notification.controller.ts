import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  async getNotifications(
    @CurrentUser('doctorId') doctorId: string,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getNotifications(
      doctorId,
      limit ? Number(limit) : 30,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser('doctorId') doctorId: string) {
    const count = await this.notificationService.getUnreadCount(doctorId);
    return { unreadCount: count };
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @CurrentUser('doctorId') doctorId: string,
    @Param('notificationId') notificationId: string,
    @Body() body: { createdAt: string },
  ) {
    await this.notificationService.markAsRead(
      doctorId,
      notificationId,
      body.createdAt,
    );
    return { status: 'ok' };
  }
}
