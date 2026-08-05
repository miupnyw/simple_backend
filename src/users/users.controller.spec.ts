import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('delegates create to UsersService', async () => {
    const dto: CreateUserDto = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'supersecret',
    };
    const created = { _id: '1', ...dto };
    service.create.mockResolvedValue(created);

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('delegates findAll to UsersService', async () => {
    const users = [{ _id: '1', name: 'Ada' }];
    service.findAll.mockResolvedValue(users);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
    expect(result).toBe(users);
  });

  it('delegates findOne to UsersService', async () => {
    const user = { _id: '1', name: 'Ada' };
    service.findOne.mockResolvedValue(user);

    const result = await controller.findOne('1');

    expect(service.findOne).toHaveBeenCalledWith('1');
    expect(result).toBe(user);
  });

  it('delegates update to UsersService', async () => {
    const dto: UpdateUserDto = { name: 'Ada Byron' };
    const updated = { _id: '1', ...dto };
    service.update.mockResolvedValue(updated);

    const result = await controller.update('1', dto);

    expect(service.update).toHaveBeenCalledWith('1', dto);
    expect(result).toBe(updated);
  });

  it('delegates remove to UsersService', async () => {
    service.remove.mockResolvedValue(undefined);

    const result = await controller.remove('1');

    expect(service.remove).toHaveBeenCalledWith('1');
    expect(result).toBeUndefined();
  });
});
