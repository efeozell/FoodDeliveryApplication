// src/common/logger/logstash.transport.ts
import Transport, { TransportStreamOptions } from 'winston-transport';
import * as net from 'net';

interface LogstashTransportOptions extends TransportStreamOptions {
  host: string;
  port: number;
}

export class LogstashTransport extends Transport {
  private host: string;
  private port: number;
  private client: net.Socket;
  private connected: boolean = false;
  private buffer: string[] = [];

  constructor(opts: LogstashTransportOptions) {
    super(opts);
    this.host = opts.host;
    this.port = opts.port;
    this.connect();
  }

  private connect() {
    if (this.client) {
      this.client.removeAllListeners();
      this.client.destroy();
    }

    this.client = new net.Socket();
    this.connected = false;

    // Bağlantı hatası olursa uygulamayı çökertme, sadece logla
    this.client.on('error', (err) => {
      // console.error(`Logstash bağlantı hatası: ${err.message}`);
      this.connected = false;
    });

    // Bağlantı koparsa yeniden bağlanmaya çalışabilirsin (opsiyonel)
    this.client.on('close', () => {
      // console.warn('Logstash bağlantısı koptu.');
      this.connected = false;
      // setTimeout(() => this.connect(), 5000); // İstersen 5sn sonra tekrar dene
    });

    this.client.connect(this.port, this.host, () => {
      // console.log(`Logstash'e bağlandı: ${this.host}:${this.port} 🚀`);
      this.connected = true;

      // Buffer'daki bekleyen logları gönder
      while (this.buffer.length > 0) {
        const log = this.buffer.shift();
        if (log) {
          this.client.write(log, (err) => {
            if (err) {
              console.log(`Logstash write hatasi: ${err.message}`);
            }
          });
        }
      }
    });
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // KRİTİK NOKTA: Logstash 'json_lines' codec'i kullandığı için
    // her JSON objesinin sonuna mutlaka '\n' (yeni satır) eklemeliyiz.
    const logEntry = JSON.stringify(info) + '\n';

    if (this.client && !this.client.destroyed && this.connected) {
      // Bağlantı varsa hemen gönder
      // console.log("[DEBUG] Logstash'e log gönderiliyor:", info.message);
      this.client.write(logEntry, (err) => {
        if (err) {
          // console.log(`Logstash write hatasi: ${err.message}`);

          if (this.buffer.length < 100) {
            this.buffer.push(logEntry);
          }
        }
      });
    } else {
      // Bağlantı yoksa buffer'a ekle (ilk 100 log)
      // console.log(
      //   "[DEBUG] Buffer'a eklendi (connected:",
      //   this.connected,
      //   ', destroyed:',
      //   this.client?.destroyed,
      //   ')',
      // );
      if (this.buffer.length < 100) {
        this.buffer.push(logEntry);
      }
    }

    callback();
  }

  // Override Winston Transport's close method for proper cleanup on shutdown
  close() {
    // Handle idempotency - safe to call multiple times
    if (!this.client) {
      return;
    }

    try {
      // Remove all listeners to prevent memory leaks
      this.client.removeAllListeners();

      // Destroy the socket connection
      if (!this.client.destroyed) {
        this.client.destroy();
      }

      // Reset connection state
      this.connected = false;

      // Clear the buffer
      this.buffer = [];

      console.log('Logstash transport closed successfully');
    } catch (err) {
      console.error('Error closing Logstash transport:', err);
    }
  }
}
