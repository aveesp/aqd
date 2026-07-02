import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../jwt-payload.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  private readonly logger = new Logger(JwtAccessStrategy.name);

  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    // Fire-and-forget — powers the "active users" analytics metric, but
    // must never slow down or fail the actual request on its account.
    this.usersService.touchLastActive(payload.sub).catch((err: unknown) => {
      this.logger.warn(`Failed to touch lastActiveAt for ${payload.sub}`, err);
    });
    return payload;
  }
}
