import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthProvider, VerificationTokenType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { AuthService } from './auth.service';
import { hashToken } from './token.util';

/**
 * Unit tests for the verification/reset logic with Prisma and the Mailer
 * mocked — the goal here is proving the SERVICE's decisions (anti-enumeration
 * silence, token expiry/reuse rejection, email dispatch on the right events),
 * not re-testing Prisma itself. DB-integration-critical paths (conflict
 * resolution, response shapes) already have dedicated tests against a real
 * schema — see conflict-resolver.spec.ts and test/contract.spec.ts.
 */
describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    verificationToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let mailer: { send: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      verificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    mailer = { send: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailerService, useValue: mailer },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('signed-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) =>
              key === 'WEB_APP_URL' ? 'http://localhost:5173' : 'secret',
            ),
            get: jest.fn((_key: string, fallback: unknown) => fallback),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('rejects an already-registered email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(
        service.register({ email: 'a@b.com', password: 'password123', displayName: 'A' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the user and sends a verification email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        displayName: 'A',
        emailVerified: false,
      });

      const result = await service.register({
        email: 'a@b.com',
        password: 'password123',
        displayName: 'A',
      });

      expect(prisma.verificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: VerificationTokenType.EMAIL_VERIFY }),
        }),
      );
      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'a@b.com', subject: expect.stringContaining('Verify') }),
      );
      expect(result.user.emailVerified).toBe(false);
      expect(result.accessToken).toBe('signed-token');
    });
  });

  describe('resendVerification', () => {
    it('silently does nothing for an unknown email (anti-enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.resendVerification('nobody@x.com')).resolves.toBeUndefined();
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('silently does nothing if already verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        emailVerified: true,
      });
      await service.resendVerification('a@b.com');
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('sends a new verification email for an unverified user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        emailVerified: false,
      });
      await service.resendVerification('a@b.com');
      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'a@b.com' }),
      );
    });
  });

  describe('verifyEmail', () => {
    it('marks the user verified when the token is valid and unused', async () => {
      const token = 'plain-token';
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        type: VerificationTokenType.EMAIL_VERIFY,
        tokenHash: hashToken(token),
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await service.verifyEmail(token);

      expect(prisma.verificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' }, data: { usedAt: expect.any(Date) } }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' }, data: { emailVerified: true } }),
      );
    });

    it('rejects a token that does not exist', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bogus')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an already-used token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        type: VerificationTokenType.EMAIL_VERIFY,
        tokenHash: hashToken('used'),
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(service.verifyEmail('used')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expired token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        type: VerificationTokenType.EMAIL_VERIFY,
        tokenHash: hashToken('expired'),
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.verifyEmail('expired')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a token of the wrong type (e.g. a password-reset token at the verify endpoint)', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: 'u1',
        type: VerificationTokenType.PASSWORD_RESET,
        tokenHash: hashToken('wrong-type'),
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(service.verifyEmail('wrong-type')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('upgrade (guest -> account)', () => {
    it('rejects if the account already has email/password credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', provider: AuthProvider.EMAIL });
      await expect(
        service.upgrade('u1', { email: 'a@b.com', password: 'password123', displayName: 'A' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects if the target email is already registered to another account', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', provider: AuthProvider.GUEST })
        .mockResolvedValueOnce({ id: 'u2' }); // existing email owner
      await expect(
        service.upgrade('u1', { email: 'a@b.com', password: 'password123', displayName: 'A' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('attaches credentials to the guest account and sends verification', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', provider: AuthProvider.GUEST })
        .mockResolvedValueOnce(null);
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        displayName: 'A',
        emailVerified: false,
      });

      const result = await service.upgrade('u1', {
        email: 'a@b.com',
        password: 'password123',
        displayName: 'A',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({ email: 'a@b.com', provider: AuthProvider.EMAIL }),
        }),
      );
      expect(mailer.send).toHaveBeenCalled();
      expect(result.user.id).toBe('u1');
    });
  });
});
