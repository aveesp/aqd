import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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
      await bcrypt.hash(tokens.refreshToken, BCRYPT_ROUNDS),
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
    const matches = await bcrypt.compare(
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
      await bcrypt.hash(tokens.refreshToken, BCRYPT_ROUNDS),
    );
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshTokenHash(userId, null);
  }

  private async issueTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:
          this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
        expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ??
          '15m') as SignOptionsExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret:
          this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ??
          '7d') as SignOptionsExpiresIn,
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
