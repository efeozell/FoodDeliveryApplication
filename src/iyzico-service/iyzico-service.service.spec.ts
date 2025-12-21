import { Test, TestingModule } from '@nestjs/testing';
import { IyzicoServiceService } from './iyzico-service.service';

describe('IyzicoServiceService', () => {
  let service: IyzicoServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IyzicoServiceService],
    }).compile();

    service = module.get<IyzicoServiceService>(IyzicoServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
