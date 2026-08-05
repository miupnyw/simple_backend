import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { HashingService } from './hashing/hashing.service';
import { User, UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';

const VALID_ID = '507f1f77bcf86cd799439011';
const INVALID_ID = 'not-an-object-id';

const execMock = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('UsersService', () => {
  let service: UsersService;
  let userModel: jest.Mock & Record<string, jest.Mock>;
  let hashingService: { hash: jest.Mock; compare: jest.Mock };
  let saveMock: jest.Mock;

  beforeEach(async () => {
    saveMock = jest.fn();

    userModel = jest
      .fn()
      .mockImplementation((doc: Record<string, unknown>) => ({
        ...doc,
        save: saveMock,
      })) as unknown as jest.Mock & Record<string, jest.Mock>;
    userModel.find = jest.fn();
    userModel.findOne = jest.fn();
    userModel.findById = jest.fn();
    userModel.findByIdAndUpdate = jest.fn();
    userModel.findByIdAndDelete = jest.fn();
    userModel.updateOne = jest.fn();

    hashingService = { hash: jest.fn(), compare: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: HashingService, useValue: hashingService },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'supersecret',
    };

    it('creates and saves a user with a hashed password', async () => {
      userModel.findOne.mockReturnValue(execMock(null));
      hashingService.hash.mockResolvedValue('hashed-password');
      saveMock.mockResolvedValue({
        _id: VALID_ID,
        ...createUserDto,
        password: 'hashed-password',
      });

      const result = await service.create(createUserDto);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(hashingService.hash).toHaveBeenCalledWith(createUserDto.password);
      expect(userModel).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashed-password',
      });
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({
        _id: VALID_ID,
        ...createUserDto,
        password: 'hashed-password',
      });
    });

    it('throws ConflictException when the email is already in use', async () => {
      userModel.findOne.mockReturnValue(execMock({ _id: VALID_ID }));

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(hashingService.hash).not.toHaveBeenCalled();
      expect(saveMock).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns all users', async () => {
      const users = [
        { _id: VALID_ID, name: 'Ada' },
      ] as unknown as UserDocument[];
      userModel.find.mockReturnValue(execMock(users));

      const result = await service.findAll();

      expect(result).toBe(users);
      expect(userModel.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the user when found', async () => {
      const user = { _id: VALID_ID, name: 'Ada' } as unknown as UserDocument;
      userModel.findById.mockReturnValue(execMock(user));

      const result = await service.findOne(VALID_ID);

      expect(result).toBe(user);
      expect(userModel.findById).toHaveBeenCalledWith(VALID_ID);
    });

    it('throws BadRequestException for an invalid id', async () => {
      await expect(service.findOne(INVALID_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(userModel.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userModel.findById.mockReturnValue(execMock(null));

      await expect(service.findOne(VALID_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates a user without changing the email or password', async () => {
      const updateUserDto = { name: 'Ada Byron' };
      const updated = { _id: VALID_ID, ...updateUserDto };
      userModel.findByIdAndUpdate.mockReturnValue(execMock(updated));

      const result = await service.update(VALID_ID, updateUserDto);

      expect(userModel.findOne).not.toHaveBeenCalled();
      expect(hashingService.hash).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_ID,
        updateUserDto,
        { new: true },
      );
      expect(result).toBe(updated);
    });

    it('hashes the password when it is being updated', async () => {
      const updateUserDto = { password: 'newpassword' };
      hashingService.hash.mockResolvedValue('new-hashed-password');
      userModel.findByIdAndUpdate.mockReturnValue(
        execMock({ _id: VALID_ID, password: 'new-hashed-password' }),
      );

      await service.update(VALID_ID, updateUserDto);

      expect(hashingService.hash).toHaveBeenCalledWith('newpassword');
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_ID,
        { password: 'new-hashed-password' },
        { new: true },
      );
    });

    it('throws ConflictException when the new email is already in use', async () => {
      const updateUserDto = { email: 'taken@example.com' };
      userModel.findOne.mockReturnValue(execMock({ _id: 'other-id' }));

      await expect(service.update(VALID_ID, updateUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: updateUserDto.email,
        _id: { $ne: VALID_ID },
      });
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an invalid id', async () => {
      await expect(service.update(INVALID_ID, { name: 'Ada' })).rejects.toThrow(
        BadRequestException,
      );
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userModel.findByIdAndUpdate.mockReturnValue(execMock(null));

      await expect(service.update(VALID_ID, { name: 'Ada' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the user when found', async () => {
      userModel.findByIdAndDelete.mockReturnValue(execMock({ _id: VALID_ID }));

      await service.remove(VALID_ID);

      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith(VALID_ID);
    });

    it('throws BadRequestException for an invalid id', async () => {
      await expect(service.remove(INVALID_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(userModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userModel.findByIdAndDelete.mockReturnValue(execMock(null));

      await expect(service.remove(VALID_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmailWithPassword', () => {
    it('queries by email selecting the password field', async () => {
      const user = { _id: VALID_ID, email: 'ada@example.com' };
      const selectMock = jest.fn().mockReturnValue(execMock(user));
      userModel.findOne.mockReturnValue({ select: selectMock });

      const result = await service.findByEmailWithPassword('ada@example.com');

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'ada@example.com',
      });
      expect(selectMock).toHaveBeenCalledWith('+password');
      expect(result).toBe(user);
    });
  });

  describe('findByIdWithRefreshToken', () => {
    it('returns null for an invalid id without querying the model', async () => {
      const result = await service.findByIdWithRefreshToken(INVALID_ID);

      expect(result).toBeNull();
      expect(userModel.findById).not.toHaveBeenCalled();
    });

    it('queries by id selecting the hashedRefreshToken field', async () => {
      const user = { _id: VALID_ID, hashedRefreshToken: 'hash' };
      const selectMock = jest.fn().mockReturnValue(execMock(user));
      userModel.findById.mockReturnValue({ select: selectMock });

      const result = await service.findByIdWithRefreshToken(VALID_ID);

      expect(userModel.findById).toHaveBeenCalledWith(VALID_ID);
      expect(selectMock).toHaveBeenCalledWith('+hashedRefreshToken');
      expect(result).toBe(user);
    });
  });

  describe('setRefreshTokenHash', () => {
    it('updates the hashedRefreshToken field for the user', async () => {
      userModel.updateOne.mockReturnValue(execMock({ acknowledged: true }));

      await service.setRefreshTokenHash(VALID_ID, 'hashed-token');

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: VALID_ID },
        { hashedRefreshToken: 'hashed-token' },
      );
    });

    it('clears the hashedRefreshToken field when passed null', async () => {
      userModel.updateOne.mockReturnValue(execMock({ acknowledged: true }));

      await service.setRefreshTokenHash(VALID_ID, null);

      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: VALID_ID },
        { hashedRefreshToken: null },
      );
    });
  });
});
