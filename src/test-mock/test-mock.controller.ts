import { Controller, Get, Query } from '@nestjs/common';

@Controller('test-mock')
export class TestMockController {
  @Get('success')
  getSuccess(@Query('orderId') orderId: string) {
    return `<h1>ÖDEME BAŞARILI! 🎉</h1> <p>Sipariş No: ${orderId}</p>`;
  }

  @Get('fail')
  getFail(@Query('reason') reason: string) {
    return `<h1>ÖDEME HATALI 😔</h1> <p>Sebep: ${reason}</p>`;
  }
}
