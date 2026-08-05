import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: { getHello: jest.Mock };

  beforeEach(async () => {
    service = { getHello: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: service }],
    }).compile();

    controller = module.get(AppController);
  });

  it('returns the value from AppService.getHello', () => {
    service.getHello.mockReturnValue('Hello World!');

    expect(controller.getHello()).toBe('Hello World!');
    expect(service.getHello).toHaveBeenCalled();
  });
});
