import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private config: ConfigService) {
    const secret = this.config.getOrThrow<string>('INTEGRATION_ENCRYPTION_KEY');
    // Derive a 32-byte key from the secret
    this.key = crypto.createHash('sha256').update(secret).digest();
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv) as crypto.CipherGCM;
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv(12):tag(16):ciphertext — all base64
    return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt(ciphertext: string): string {
    const [ivB64, tagB64, dataB64] = ciphertext.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final('utf8');
  }
}
