import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayloadWithRefreshToken } from './interfaces/jwt-payload.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    validateUser: jest.Mock;
    login: jest.Mock;
    refreshTokens: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      validateUser: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get(AuthController);
  });

  describe('login', () => {
    it('validates credentials and returns a token pair', async () => {
      const loginDto: LoginDto = {
        email: 'ada@example.com',
        password: 'supersecret',
      };
      const user = { _id: '1', email: 'ada@example.com' };
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };
      service.validateUser.mockResolvedValue(user);
      service.login.mockResolvedValue(tokens);

      const result = await controller.login(loginDto);

      expect(service.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(service.login).toHaveBeenCalledWith(user);
      expect(result).toBe(tokens);
    });
  });

  describe('refresh', () => {
    it('delegates to AuthService.refreshTokens using the current user', async () => {
      const currentUser: JwtPayloadWithRefreshToken = {
        sub: '1',
        email: 'ada@example.com',
        refreshToken: 'refresh-token',
      };
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };
      service.refreshTokens.mockResolvedValue(tokens);

      const result = await controller.refresh(currentUser);

      expect(service.refreshTokens).toHaveBeenCalledWith(
        currentUser.sub,
        currentUser.refreshToken,
      );
      expect(result).toBe(tokens);
    });
  });

  describe('logout', () => {
    it('delegates to AuthService.logout using the current user', async () => {
      const currentUser: JwtPayloadWithRefreshToken = {
        sub: '1',
        email: 'ada@example.com',
        refreshToken: 'refresh-token',
      };
      service.logout.mockResolvedValue(undefined);

      const result = await controller.logout(currentUser);

      expect(service.logout).toHaveBeenCalledWith(currentUser.sub);
      expect(result).toBeUndefined();
    });
  });
});
