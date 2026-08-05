import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmailWithPassword: jest.Mock;
    findByIdWithRefreshToken: jest.Mock;
    setRefreshTokenHash: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let configService: { getOrThrow: jest.Mock };
  const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  const config: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_SECRET: 'refresh-secret',
    JWT_REFRESH_EXPIRES_IN: '7d',
  };

  beforeEach(async () => {
    usersService = {
      findByEmailWithPassword: jest.fn(),
      findByIdWithRefreshToken: jest.fn(),
      setRefreshTokenHash: jest.fn(),
    };
    jwtService = { signAsync: jest.fn() };
    configService = {
      getOrThrow: jest.fn((key: string) => config[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('returns the user when the password matches', async () => {
      const user = { _id: '1', email: 'ada@example.com', password: 'hashed' };
      usersService.findByEmailWithPassword.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser(
        'ada@example.com',
        'plain-password',
      );

      expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith(
        'ada@example.com',
      );
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'plain-password',
        'hashed',
      );
      expect(result).toBe(user);
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.validateUser('ada@example.com', 'plain-password'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      const user = { _id: '1', email: 'ada@example.com', password: 'hashed' };
      usersService.findByEmailWithPassword.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.validateUser('ada@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('issues an access/refresh token pair and stores the hashed refresh token', async () => {
      const user = { _id: '1', email: 'ada@example.com' };
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(user as never);

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { sub: '1', email: 'ada@example.com' },
        { secret: 'access-secret', expiresIn: '15m' },
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        { sub: '1', email: 'ada@example.com' },
        { secret: 'refresh-secret', expiresIn: '7d' },
      );
      const expectedHash = createHash('sha256')
        .update('refresh-token')
        .digest('hex');
      expect(usersService.setRefreshTokenHash).toHaveBeenCalledWith(
        '1',
        expectedHash,
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('refreshTokens', () => {
    it('issues new tokens when the refresh token matches', async () => {
      const refreshToken = 'valid-refresh-token';
      const hashedRefreshToken = createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      usersService.findByIdWithRefreshToken.mockResolvedValue({
        _id: '1',
        email: 'ada@example.com',
        hashedRefreshToken,
      });
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens('1', refreshToken);

      expect(usersService.findByIdWithRefreshToken).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('throws UnauthorizedException when the user has no stored refresh token', async () => {
      usersService.findByIdWithRefreshToken.mockResolvedValue({
        _id: '1',
        hashedRefreshToken: undefined,
      });

      await expect(service.refreshTokens('1', 'some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the user is not found', async () => {
      usersService.findByIdWithRefreshToken.mockResolvedValue(null);

      await expect(service.refreshTokens('1', 'some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the refresh token does not match', async () => {
      usersService.findByIdWithRefreshToken.mockResolvedValue({
        _id: '1',
        hashedRefreshToken: createHash('sha256')
          .update('a-different-token')
          .digest('hex'),
      });

      await expect(service.refreshTokens('1', 'wrong-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token hash', async () => {
      await service.logout('1');

      expect(usersService.setRefreshTokenHash).toHaveBeenCalledWith('1', null);
    });
  });
});
