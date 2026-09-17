import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Supabase の pooler は session mode だとプールが 15 本しかない。
 * Prisma の既定接続数は「物理CPUコア数 × 2 + 1」で、8コアなら 17 本 —
 * 起動しただけで上限を超え、診療の最中に EMAXCONNSESSION で落ちる。
 * 接続文字列に connection_limit が書かれていないときは、ここで明示して超えないようにする。
 */
const DEFAULT_CONNECTION_LIMIT = 8;
/** プール待ちで即エラーにせず、少し待つ（秒）。既定の10秒は連続診療だと短い。 */
const DEFAULT_POOL_TIMEOUT_SECONDS = 20;

/**
 * DATABASE_URL に connection_limit / pool_timeout を補う。
 * 既に書かれている値は尊重する（本番で個別に調整できるようにするため）。
 */
export function withConnectionLimit(
  rawUrl: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  if (!rawUrl) return rawUrl;
  if (!/^postgres(ql)?:\/\//i.test(rawUrl)) return rawUrl;

  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('connection_limit')) {
      const configured = Number(env.DATABASE_CONNECTION_LIMIT);
      const limit =
        Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CONNECTION_LIMIT;
      url.searchParams.set('connection_limit', String(limit));
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', String(DEFAULT_POOL_TIMEOUT_SECONDS));
    }
    return url.toString();
  } catch {
    // URL として読めない形式（ソケット指定など）はそのまま使う
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = withConnectionLimit(process.env.DATABASE_URL);
    super(url ? { datasources: { db: { url } } } : {});
  }

  async onModuleInit() {
    await this.$connect();
    const limit = withConnectionLimit(process.env.DATABASE_URL)
      ?.match(/connection_limit=(\d+)/)?.[1];
    if (limit) this.logger.log(`DB connection limit: ${limit}`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
