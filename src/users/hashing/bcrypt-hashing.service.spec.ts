import * as bcrypt from 'bcryptjs';
import { BcryptHashingService } from './bcrypt-hashing.service';

jest.mock('bcryptjs');

describe('BcryptHashingService', () => {
  let service: BcryptHashingService;
  const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(() => {
    service = new BcryptHashingService();
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('hashes the plain value with 10 salt rounds', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);

      const result = await service.hash('plain-password');

      expect(result).toBe('hashed-value');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('plain-password', 10);
    });
  });

  describe('compare', () => {
    it('returns true when the plain value matches the hash', async () => {
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.compare('plain-password', 'hashed-value');

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'plain-password',
        'hashed-value',
      );
    });

    it('returns false when the plain value does not match the hash', async () => {
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.compare('wrong-password', 'hashed-value');

      expect(result).toBe(false);
    });
  });
});
