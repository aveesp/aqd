import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { MatchesService } from '../matches/matches.service';
import { JwtPayload } from '../auth/jwt-payload.interface';

function userRoom(userId: string): string {
  return `user:${userId}`;
}

interface SocketData {
  user?: JwtPayload;
}
type AuthenticatedSocket = Socket<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  SocketData
>;

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:4200',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly chatService: ChatService,
    private readonly matchesService: MatchesService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret:
          this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      });
      client.data.user = payload;
      await client.join(userRoom(payload.sub));
    } catch {
      this.logger.warn(`Rejected websocket connection: invalid token`);
      client.disconnect(true);
    }
  }

  handleDisconnect(): void {
    // Socket.IO automatically leaves all rooms on disconnect; nothing else
    // to clean up since presence state isn't persisted anywhere yet.
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { targetUserId: string; content: string },
  ): Promise<{ error: string } | { ok: true }> {
    const user = client.data.user;
    if (!user) {
      return { error: 'Not authenticated' };
    }
    try {
      const message = await this.chatService.sendMessage(
        user.sub,
        body.targetUserId,
        body.content,
      );
      const payload = {
        _id: message.id,
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      };
      this.server
        .to(userRoom(user.sub))
        .to(userRoom(body.targetUserId))
        .emit('newMessage', payload);
      return { ok: true };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to send message',
      };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { targetUserId: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    const canMessage = await this.matchesService.hasAcceptedInterest(
      user.sub,
      body.targetUserId,
    );
    if (!canMessage) return;
    this.server
      .to(userRoom(body.targetUserId))
      .emit('typing', { fromUserId: user.sub });
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token as string | undefined;
    const headerToken = client.handshake.headers.authorization?.replace(
      'Bearer ',
      '',
    );
    const queryToken = client.handshake.query?.token as string | undefined;
    return authToken ?? headerToken ?? queryToken ?? null;
  }
}
