import { Test, TestingModule } from '@nestjs/testing';
import { TestMockController } from './test-mock.controller';

describe('TestMockController', () => {
  let controller: TestMockController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestMockController],
    }).compile();

    controller = module.get<TestMockController>(TestMockController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
