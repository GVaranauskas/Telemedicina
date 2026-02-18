import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { RedisService } from '../../database/redis/redis.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly redis: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) {
      client.disconnect();
      return;
    }

    // Store user's socket mapping
    await this.redis.set(`online:${userId}`, client.id, 3600);
    client.data.userId = userId;

    // Join personal room
    client.join(`user:${userId}`);

    this.logger.log(`User ${userId} connected to chat`);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      await this.redis.del(`online:${userId}`);
      this.logger.log(`User ${userId} disconnected from chat`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      chatId: string;
      receiverId: string;
      content: string;
      messageType?: string;
      mediaUrl?: string;
    },
  ) {
    const senderId = client.data.userId;
    if (!senderId) return;

    const message = await this.chatService.sendMessage({
      chatId: payload.chatId,
      senderId,
      receiverId: payload.receiverId,
      content: payload.content,
      messageType: payload.messageType || 'TEXT',
      mediaUrl: payload.mediaUrl,
    });

    // Send to receiver if online
    this.server.to(`user:${payload.receiverId}`).emit('new_message', message);

    // Confirm to sender
    client.emit('message_sent', message);

    return message;
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string; messageId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    await this.chatService.markAsRead(payload.chatId, payload.messageId);

    return { status: 'ok' };
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string; receiverId: string },
  ) {
    this.server.to(`user:${payload.receiverId}`).emit('user_typing', {
      chatId: payload.chatId,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('check_online')
  async handleCheckOnline(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    const isOnline = await this.redis.get(`online:${payload.userId}`);
    return { userId: payload.userId, online: !!isOnline };
  }
}
