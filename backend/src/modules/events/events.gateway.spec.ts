import { EventsGateway } from './events.gateway';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

describe('EventsGateway Security & Authentication', () => {
  let gateway: EventsGateway;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let prisma: jest.Mocked<any>;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    } as any;

    prisma = {
      session: {
        findFirst: jest.fn(),
      },
    };

    gateway = new EventsGateway(jwtService as any, prisma as any);
  });

  const createMockSocket = () => {
    return {
      close: jest.fn(),
      send: jest.fn(),
      readyState: 1, // WebSocket.OPEN
    } as any;
  };

  it('rejects connection if request metadata is missing', async () => {
    const socket = createMockSocket();
    await gateway.handleConnection(socket, undefined);
    expect(socket.close).toHaveBeenCalledWith(1008, 'Missing connection metadata');
  });

  it('rejects connection if origin is not allowed (CSWSH protection)', async () => {
    const socket = createMockSocket();
    const req = {
      headers: {
        origin: 'https://evil-attacker-site.com',
      },
    } as any;

    await gateway.handleConnection(socket, req);
    expect(socket.close).toHaveBeenCalledWith(1008, 'Unauthorized origin');
  });

  it('rejects connection if no token is provided in cookie, header, or query', async () => {
    const socket = createMockSocket();
    const req = {
      headers: {
        origin: 'http://localhost:3000',
      },
      url: '/events',
    } as any;

    await gateway.handleConnection(socket, req);
    expect(socket.close).toHaveBeenCalledWith(1008, 'Authentication required');
  });

  it('rejects connection if JWT token verification fails', async () => {
    const socket = createMockSocket();
    const req = {
      headers: {
        origin: 'http://localhost:3000',
        cookie: 'access_token=invalid_jwt_token',
      },
    } as any;

    (jwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    await gateway.handleConnection(socket, req);
    expect(socket.close).toHaveBeenCalledWith(1008, 'Invalid or expired token');
  });

  it('rejects connection if session is revoked or user is deactivated in DB', async () => {
    const socket = createMockSocket();
    const req = {
      headers: {
        origin: 'http://localhost:3000',
        cookie: 'access_token=valid_token',
      },
    } as any;

    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'user-123',
      sid: 'session-456',
    });

    // Session revoked / user inactive
    prisma.session.findFirst.mockResolvedValue(null);

    await gateway.handleConnection(socket, req);
    expect(socket.close).toHaveBeenCalledWith(1008, 'Session invalid or account inactive');
  });

  it('authenticates valid connection, stores client session, and isolates broadcasts', async () => {
    const socket = createMockSocket();
    const req = {
      headers: {
        origin: 'http://localhost:3000',
        cookie: 'access_token=valid_token',
      },
    } as any;

    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'user-123',
      sid: 'session-456',
    });

    prisma.session.findFirst.mockResolvedValue({
      id: 'session-456',
      userId: 'user-123',
      isRevoked: false,
      user: {
        id: 'user-123',
        email: 'engineer@futurex.com',
        globalRole: 'TEAM_MEMBER',
        isActive: true,
        deletedAt: null,
      },
    });

    await gateway.handleConnection(socket, req);
    expect(socket.close).not.toHaveBeenCalled();
    expect(gateway.getClientCount()).toBe(1);

    // Targeted message to this user succeeds
    gateway.sendToUser('user-123', 'NOTIFICATION', { title: 'Test' });
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ event: 'NOTIFICATION', data: { title: 'Test' } }),
    );

    // Targeted message to another user is NOT sent to this socket
    gateway.sendToUser('foreign-user-999', 'SECRET', { secret: 'data' });
    expect(socket.send).toHaveBeenCalledTimes(1);

    // On disconnect, client is removed
    gateway.handleDisconnect(socket);
    expect(gateway.getClientCount()).toBe(0);
  });
});
