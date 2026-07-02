import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { UsersService } from '../users/users.service';
import { Role, ADMIN_PANEL_ROLES } from './roles.enum';
import { JwtPayload } from './jwt-payload.interface';
import { UserDocument } from '../users/schemas/user.schema';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

type SignOptionsExpiresIn = JwtSignOptions['expiresIn'];

const BCRYPT_ROUNDS = 12;

// bcrypt silently truncates its input at 72 bytes. Refresh tokens are JWTs
// (150+ chars) whose header and early payload fields (sub/email/role) are
// identical across every reissuance for the same user — meaning the first
// 72 bytes barely change between an old and a new token, so
// bcrypt.compare(oldToken, hash(newToken)) was returning true and silently
// defeating rotation entirely (caught by an e2e test, confirmed with a
// minimal repro). Refresh tokens are already high-entropy random-looking
// strings, not low-entropy human passwords, so a fast, unsalted SHA-256
// digest + constant-time comparison is the correct primitive here — bcrypt
// remains correct (and is still used) for actual password hashing above.
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function refreshTokenMatches(token: string, storedHash: string): boolean {
  const presented = createHash('sha256').update(token).digest();
  const stored = Buffer.from(storedHash, 'hex');
  if (presented.length !== stored.length) {
    return false;
  }
  return timingSafeEqual(presented, stored);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string }> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email,
      passwordHash,
      role: Role.User,
    });
    return { id: user.id, email: user.email };
  }

  async login(
    email: string,
    password: string,
  ): Promise<TokenPair & { user: { id: string; email: string; role: Role } }> {
    const user = await this.authenticate(email, password);
    if (ADMIN_PANEL_ROLES.includes(user.role)) {
      throw new UnauthorizedException(
        'Staff accounts must sign in at /admin/login',
      );
    }
    return this.completeLogin(user);
  }

  // Separate entry point for support_staff/matchmaking_staff/admin/super_admin,
  // per the SRS's requirement for a distinct admin-panel login route (not a
  // separate frontend app — just a distinct, more tightly rate-limited
  // backend endpoint that rejects regular-user credentials).
  async adminLogin(
    email: string,
    password: string,
  ): Promise<TokenPair & { user: { id: string; email: string; role: Role } }> {
    const user = await this.authenticate(email, password);
    if (!ADMIN_PANEL_ROLES.includes(user.role)) {
      throw new UnauthorizedException('This login is for staff accounts only');
    }
    return this.completeLogin(user);
  }

  private async authenticate(
    email: string,
    password: string,
  ): Promise<UserDocument> {
    const user = await this.usersService.findByEmail(email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  private async completeLogin(
    user: UserDocument,
  ): Promise<TokenPair & { user: { id: string; email: string; role: Role } }> {
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    await this.usersService.setRefreshTokenHash(
      user.id,
      hashRefreshToken(tokens.refreshToken),
    );
    await this.usersService.touchLastLogin(user.id);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async refresh(
    userId: string,
    presentedRefreshToken: string,
  ): Promise<TokenPair> {
    const user = await this.usersService.findByIdWithRefreshHash(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const matches = refreshTokenMatches(
      presentedRefreshToken,
      user.refreshTokenHash,
    );
    if (!matches) {
      // Possible token reuse/theft: invalidate the stored hash so the old token can never be replayed again.
      await this.usersService.setRefreshTokenHash(user.id, null);
      throw new UnauthorizedException('Invalid refresh token');
    }
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    await this.usersService.setRefreshTokenHash(
      user.id,
      hashRefreshToken(tokens.refreshToken),
    );
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshTokenHash(userId, null);
  }

  private async issueTokens(payload: JwtPayload): Promise<TokenPair> {
    // A bare {sub, email, role} payload signed twice within the same
    // wall-clock second (identical `iat`/`exp`) produces byte-identical
    // JWTs — silently defeating refresh-token rotation, since the "new"
    // token would be indistinguishable from the one it's meant to replace.
    // A per-issuance jti guarantees uniqueness regardless of timing.
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, jti: randomUUID() },
        {
          secret:
            this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
          expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ??
            '15m') as SignOptionsExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        { ...payload, jti: randomUUID() },
        {
          secret:
            this.config.get<string>('JWT_REFRESH_SECRET') ??
            'dev-refresh-secret',
          expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ??
            '7d') as SignOptionsExpiresIn,
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }
}
