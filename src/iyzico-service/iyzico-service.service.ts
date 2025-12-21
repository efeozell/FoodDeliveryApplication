import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Iyzipay = require('iyzipay');

@Injectable()
export class IyzicoService {
  private iyzipay;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('IYZICO_API_KEY');
    const secretKey = this.configService.get<string>('IYZICO_API_KEY_SECRET');
    const uri = this.configService.get<string>('IYZIPAY_URI');

    if (!apiKey || !secretKey || !uri) {
      throw new Error('Iyzico API bilgileri eksik');
    }

    this.iyzipay = new Iyzipay({
      apiKey,
      secretKey,
      uri,
    });
  }

  async startPaymentProcess(data: any): Promise<any> {
    //Bize sonuc olarak bir cevap vermesi icin soz yani Promise kullanarak bir callback metod olusturduk
    return new Promise((resolve, reject) => {
      //data: sepet kullanici bilgileri vs
      //err, result callback metoddur iyziconun isi bittiginde bu metod cagirilir
      this.iyzipay.checkoutFormInitialize.create(data, (err, result) => {
        if (err) {
          reject(new Error(err));
        } else {
          resolve(result);
        }
      });
    });
  }

  //Kullanici odeme isleminden sonra kullanici bize bir token ile birlikte geri doner bu token'i bu metoda parametre olarak veririz ve odemenin sonucunu aliriz
  //Direkt olarak await ile this.iyzicoService.getPaymentResult(token) seklinde cagiramadik iyzico kutuphanesi bunu desteklemiyor
  //Bizde bunu bu yuzden Promise yapiya yani async/await yapisina cevirdik
  async getPaymentResult(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.iyzipay.checkoutForm.retrieve({ token }, (err, result) => {
        if (err) {
          reject(new Error(err));
        } else {
          resolve(result);
        }
      });
    });
  }
}
