import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { getJwtAccessSecret } from '../auth/auth-secrets';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: getJwtAccessSecret(),
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
