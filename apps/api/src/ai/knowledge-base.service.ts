import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import OpenAI from "openai";
import * as cheerio from "cheerio";

const CHUNK_SIZE = 500; // characters
const CHUNK_OVERLAP = 50;
const TOP_K = 3;

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({ apiKey: this.config.get<string>("OPENAI_API_KEY") });
  }

  // ── Scrape & Index ────────────────────────────────────────────────────────

  async indexUrl(url: string, organizationId: string, widgetId?: string): Promise<number> {
    const html = await this.fetchHtml(url);
    const text = this.extractText(html);
    const chunks = this.chunkText(text);

    let indexed = 0;
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.embed(chunks[i]);
      await this.upsertChunk(organizationId, url, chunks[i], embedding, i, widgetId);
      indexed++;
    }

    this.logger.log(`Indexed ${indexed} chunks from ${url} for org ${organizationId}`);
    return indexed;
  }

  // ── Semantic Search ───────────────────────────────────────────────────────

  async search(query: string, organizationId: string, widgetId?: string): Promise<string[]> {
    const embedding = await this.embed(query);
    const vectorLiteral = `[${embedding.join(",")}]`;

    // pgvector cosine similarity via raw query — two separate calls to avoid spread type issues
    const rows: Array<{ content: string }> = widgetId
      ? await (this.prisma as any).$queryRawUnsafe(
          `SELECT content FROM "KnowledgeChunk" WHERE "organizationId" = $1 AND "widgetId" = $3 ORDER BY embedding <=> $2::vector LIMIT ${TOP_K}`,
          organizationId, vectorLiteral, widgetId,
        )
      : await (this.prisma as any).$queryRawUnsafe(
          `SELECT content FROM "KnowledgeChunk" WHERE "organizationId" = $1 ORDER BY embedding <=> $2::vector LIMIT ${TOP_K}`,
          organizationId, vectorLiteral,
        );

    return rows.map((r: { content: string }) => r.content);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: { "User-Agent": "YayChatbot-Indexer/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.text();
  }

  private extractText(html: string): string {
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, noscript").remove();
    return $("body").text().replace(/\s+/g, " ").trim();
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      chunks.push(text.slice(start, end).trim());
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks.filter((c) => c.length > 20);
  }

  private async embed(text: string): Promise<number[]> {
    const res = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    });
    return res.data[0].embedding;
  }

  private async upsertChunk(
    organizationId: string,
    sourceUrl: string,
    content: string,
    embedding: number[],
    chunkIndex: number,
    widgetId?: string,
  ) {
    const vectorLiteral = `[${embedding.join(",")}]`;
    await (this.prisma as any).$executeRawUnsafe(
      `INSERT INTO "KnowledgeChunk" (id, "organizationId", "widgetId", "sourceUrl", content, embedding, "chunkIndex", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, $6, now())
       ON CONFLICT DO NOTHING`,
      organizationId,
      widgetId ?? null,
      sourceUrl,
      content,
      vectorLiteral,
      chunkIndex,
    );
  }
}
