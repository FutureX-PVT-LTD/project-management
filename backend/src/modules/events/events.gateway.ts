import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { PrismaService } from '../prisma/prisma.service';
import { allowedOrigins } from '../../common/security/http-security';
import { JwtPayload } from '@futurex/shared';
import { IDLE_MS } from '../auth/session-policy';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

export interface AuthenticatedClientMeta {
  userId: string;
  role: string;
  email: string;
}

@WebSocketGateway({
  cors: { origin: allowedOrigins() },
})
@Injectable()
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private clients = new Map<WebSocket, AuthenticatedClientMeta>();
  private credentials = new Map<WebSocket, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized with authentication and origin restrictions');
  }

  async handleConnection(client: WebSocket, request?: IncomingMessage) {
    try {
      if (!request || !request.headers) {
        this.logger.warn('WS connection rejected: missing connection metadata');
        client.close(1008, 'Missing connection metadata');
        return;
      }

      // 1. Origin verification (CSWSH protection)
      const origin = request.headers.origin;
      if (origin && !allowedOrigins().includes(origin)) {
        this.logger.warn(`WS connection rejected: unauthorized origin ${origin}`);
        client.close(1008, 'Unauthorized origin');
        return;
      }

      // URL tokens leak into proxy/access logs; only cookies and headers are accepted.
      let token: string | undefined;
      const cookieHeader = request.headers.cookie;
      if (cookieHeader) {
        const cookies = parseCookies(cookieHeader);
        token = cookies['access_token'];
      }
      if (!token && request.headers.authorization) {
        const parts = request.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1];
        }
      }

      if (!token) {
        this.logger.warn('WS connection rejected: unauthenticated (no token found)');
        client.close(1008, 'Authentication required');
        return;
      }

      // 3. Verify JWT signature and expiration
      let payload: JwtPayload;
      try {
        payload = this.jwtService.verify<JwtPayload>(token, { algorithms: ['HS256'] });
      } catch (jwtErr) {
        this.logger.warn(
          `WS connection rejected: invalid JWT token (${jwtErr instanceof Error ? jwtErr.message : 'failed'})`,
        );
        client.close(1008, 'Invalid or expired token');
        return;
      }

      if (!payload || !payload.sub || !payload.sid) {
        this.logger.warn('WS connection rejected: malformed JWT claims');
        client.close(1008, 'Malformed token');
        return;
      }

      // 4. Verify session in PostgreSQL
      const now = new Date();
      const session = await this.prisma.session.findFirst({
        where: {
          id: payload.sid,
          userId: payload.sub,
          isRevoked: false,
          expiresAt: { gt: now },
          lastSeenAt: { gt: new Date(now.getTime() - IDLE_MS) },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              globalRole: true,
              isActive: true,
              deletedAt: true,
              mustChangePassword: true,
            },
          },
        },
      });

      if (!session || !session.user || !session.user.isActive || session.user.deletedAt || session.user.mustChangePassword) {
        this.logger.warn(
          `WS connection rejected: session revoked or user inactive for ${payload.sub}`,
        );
        client.close(1008, 'Session invalid or account inactive');
        return;
      }

      // Store authenticated client info
      this.clients.set(client, {
        userId: session.user.id,
        role: session.user.globalRole,
        email: session.user.email,
      });
      this.credentials.set(client, token);

      this.logger.log(
        `Client connected: user ${session.user.id} (${session.user.globalRole}), total authenticated = ${this.clients.size}`,
      );
    } catch (err) {
      this.logger.warn(
        `WS connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      client.close(1008, 'Internal error during authentication');
    }
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
    this.credentials.delete(client);
    this.logger.log(`Client disconnected: total authenticated = ${this.clients.size}`);
  }

  async broadcast(
    event: string,
    data: any,
    filter?: (meta: AuthenticatedClientMeta) => boolean,
  ) {
    const payload = JSON.stringify({ event, data });
    for (const [client] of this.clients.entries()) {
      // Revalidate before every delivery; a quiet socket must not keep a session alive.
      try {
        const claims = this.jwtService.verify<JwtPayload>(this.credentials.get(client) || '', { algorithms: ['HS256'] });
        const now = new Date();
        const session = await this.prisma.session.findFirst({
          where: { id: claims.sid, userId: claims.sub, isRevoked: false, expiresAt: { gt: now }, lastSeenAt: { gt: new Date(now.getTime() - IDLE_MS) }, user: { isActive: true, deletedAt: null, mustChangePassword: false } },
          include: { user: { select: { id: true, globalRole: true, email: true } } },
        });
        if (!session) throw new Error('Session no longer valid');
        this.clients.set(client, { userId: session.user.id, role: session.user.globalRole, email: session.user.email });
      } catch {
        client.close(1008, 'Session expired or revoked');
        this.handleDisconnect(client);
        continue;
      }
      const meta = this.clients.get(client)!;
      if (client.readyState === WebSocket.OPEN) {
        if (!filter || filter(meta)) {
          client.send(payload);
        }
      }
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    return this.broadcast(event, data, (meta) => meta.userId === userId);
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
