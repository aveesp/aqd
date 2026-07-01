import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../jwt-payload.interface';

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): JwtRefreshPayload {
    const authHeader = req.get('authorization') ?? '';
    const refreshToken = authHeader.replace('Bearer', '').trim();
    return { ...payload, refreshToken };
  }
}
