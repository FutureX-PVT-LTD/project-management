import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private clients = new Set<WebSocket>();

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: WebSocket) {
    this.clients.add(client);
    this.logger.log(`Client connected: total clients = ${this.clients.size}`);
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
    this.logger.log(`Client disconnected: total clients = ${this.clients.size}`);
  }

  broadcast(event: string, data: any) {
    const payload = JSON.stringify({ event, data });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}
