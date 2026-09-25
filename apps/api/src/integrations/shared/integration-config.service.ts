import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from './encryption.service';

export type IntegrationProvider = 'calendly' | 'hubspot' | 'slack' | 'resend';

export interface TokenPayload {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class IntegrationConfigService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async upsert(
    organizationId: string,
    provider: IntegrationProvider,
    tokens: TokenPayload,
  ): Promise<void> {
    const encryptedAccess = this.encryption.encrypt(tokens.accessToken);
    const encryptedRefresh = tokens.refreshToken
      ? this.encryption.encrypt(tokens.refreshToken)
      : null;

    await this.prisma.integrationConfig.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      create: {
        organizationId,
        provider,
        encryptedAccessToken: encryptedAccess,
        encryptedRefreshToken: encryptedRefresh,
        expiresAt: tokens.expiresAt ?? null,
        metadata: tokens.metadata ?? {},
      },
      update: {
        encryptedAccessToken: encryptedAccess,
        encryptedRefreshToken: encryptedRefresh,
        expiresAt: tokens.expiresAt ?? null,
        metadata: tokens.metadata ?? {},
        updatedAt: new Date(),
      },
    });
  }

  async getTokens(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<TokenPayload | null> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });
    if (!config) return null;

    return {
      accessToken: this.encryption.decrypt(config.encryptedAccessToken),
      refreshToken: config.encryptedRefreshToken
        ? this.encryption.decrypt(config.encryptedRefreshToken)
        : undefined,
      expiresAt: config.expiresAt ?? undefined,
      metadata: (config.metadata as Record<string, unknown>) ?? {},
    };
  }

  async delete(organizationId: string, provider: IntegrationProvider): Promise<void> {
    await this.prisma.integrationConfig.deleteMany({
      where: { organizationId, provider },
    });
  }

  async isConnected(organizationId: string, provider: IntegrationProvider): Promise<boolean> {
    const count = await this.prisma.integrationConfig.count({
      where: { organizationId, provider },
    });
    return count > 0;
  }
}
