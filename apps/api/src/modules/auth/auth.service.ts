import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthProvider, VerificationTokenType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { passwordResetTemplate, verifyEmailTemplate } from '../mailer/templates';
import { generateToken, hashToken } from './token.util';
import type { JwtPayload } from './jwt-payload';
import type {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpgradeGuestDto,
} from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

export interface AuthResult extends AuthTokens {
  user: AuthUser;
}

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        provider: AuthProvider.EMAIL,
      },
    });

    await this.sendVerificationEmail(user.id, user.email as string);
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  /**
   * Guest mode: creates a fresh anonymous user with no email/password, no
   * verification needed (there's no email to verify). `upgrade()` later
   * attaches real credentials to this same user id — the guest's data
   * (already synced under this user id) carries over with no migration.
   */
  async guest(): Promise<AuthResult> {
    const user = await this.prisma.user.create({
      data: { provider: AuthProvider.GUEST },
    });
    return this.issueTokens(user);
  }

  /** Attaches email/password to the currently-authenticated (guest) account. */
  async upgrade(userId: string, dto: UpgradeGuestDto): Promise<AuthResult> {
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw new UnauthorizedException('User no longer exists');
    if (current.provider === AuthProvider.EMAIL) {
      throw new BadRequestException('Account already has email/password credentials');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        provider: AuthProvider.EMAIL,
      },
    });

    await this.sendVerificationEmail(user.id, user.email as string);
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User no longer exists');

    return this.signTokenPair(user.id, user.email);
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.consumeToken(token, VerificationTokenType.EMAIL_VERIFY);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Deliberately silent on "user not found" / "already verified" — this
    // endpoint is unauthenticated (the user isn't logged in yet), so it must
    // not leak which emails are registered.
    if (!user?.email || user.emailVerified) return;
    await this.sendVerificationEmail(user.id, user.email);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.email) return; // same anti-enumeration reasoning as resendVerification

    const { token, tokenHash } = generateToken();
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: VerificationTokenType.PASSWORD_RESET,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    const resetUrl = `${this.config.getOrThrow<string>('WEB_APP_URL')}/reset-password?token=${token}`;
    await this.mailer.send({
      to: user.email,
      subject: 'Reset your ToDoMaster password',
      html: passwordResetTemplate(resetUrl),
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.consumeToken(dto.token, VerificationTokenType.PASSWORD_RESET);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
  }

  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const { token, tokenHash } = generateToken();
    await this.prisma.verificationToken.create({
      data: {
        userId,
        type: VerificationTokenType.EMAIL_VERIFY,
        tokenHash,
        expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
      },
    });

    const verifyUrl = `${this.config.getOrThrow<string>('WEB_APP_URL')}/verify-email?token=${token}`;
    await this.mailer.send({
      to: email,
      subject: 'Verify your ToDoMaster email',
      html: verifyEmailTemplate(verifyUrl),
    });
  }

  /** Looks up a token by hash, validates it's unused and unexpired, marks it used. */
  private async consumeToken(token: string, type: VerificationTokenType) {
    const tokenHash = hashToken(token);
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.type !== type || record.usedAt !== null) {
      throw new BadRequestException('Invalid or already-used token');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Token has expired');
    }

    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return record;
  }

  private async issueTokens(user: {
    id: string;
    email: string | null;
    displayName: string | null;
    emailVerified: boolean;
  }): Promise<AuthResult> {
    const tokens = await this.signTokenPair(user.id, user.email);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      },
    };
  }

  private async signTokenPair(id: string, email: string | null): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: id, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '30d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
