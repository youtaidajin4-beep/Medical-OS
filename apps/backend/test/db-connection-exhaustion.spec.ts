import { withConnectionLimit } from '../src/database/prisma.service';
import { TranscriptService } from '../src/modules/transcript/transcript.service';

/**
 * 2026-09-05、谷口先生の午前の診療で6人中4人が
 * "EMAXCONNSESSION: max clients reached in session mode - pool_size: 15" で落ちた。
 * 原因は「セグメントを1件ずつ並列 INSERT」と「Prisma の接続数が無指定」の2つ。
 * どちらも構造で戻らないよう、ここで固定する。
 */
describe('DB接続の枯渇対策', () => {
  describe('withConnectionLimit', () => {
    it('connection_limit が無い接続文字列には既定値を足す', () => {
      const url = withConnectionLimit('postgresql://u:p@db.example.com:5432/postgres', {} as never);
      expect(url).toContain('connection_limit=8');
      expect(url).toContain('pool_timeout=20');
    });

    it('既に書かれている connection_limit は上書きしない', () => {
      const url = withConnectionLimit(
        'postgresql://u:p@db.example.com:5432/postgres?connection_limit=3',
        {} as never,
      );
      expect(url).toContain('connection_limit=3');
      expect(url).not.toContain('connection_limit=8');
    });

    it('DATABASE_CONNECTION_LIMIT で本番から調整できる', () => {
      const url = withConnectionLimit('postgresql://u:p@db.example.com:5432/postgres', {
        DATABASE_CONNECTION_LIMIT: '5',
      } as never);
      expect(url).toContain('connection_limit=5');
    });

    it('Supabase の session mode（pool_size 15）を超えない既定値である', () => {
      const url = withConnectionLimit('postgresql://u:p@db.example.com:5432/postgres', {} as never);
      const limit = Number(url?.match(/connection_limit=(\d+)/)?.[1]);
      expect(limit).toBeLessThan(15);
    });

    it('URL として読めない値はそのまま返す', () => {
      expect(withConnectionLimit(undefined)).toBeUndefined();
      expect(withConnectionLimit('file:./dev.db')).toBe('file:./dev.db');
    });
  });

  describe('finalizeFromAudio', () => {
    const buildService = () => {
      const created: unknown[] = [];
      const prisma = {
        transcriptSegment: {
          create: jest.fn(),
          createMany: jest.fn((args: unknown) => {
            created.push(args);
            return args;
          }),
          deleteMany: jest.fn((args: unknown) => args),
          findMany: jest.fn().mockResolvedValue([]),
        },
        $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
      };
      const stt = {
        name: 'openai',
        transcribeFinal: jest.fn().mockResolvedValue(
          Array.from({ length: 120 }, (_, i) => ({ text: `発話${i}`, confidence: 0.9 })),
        ),
      };
      const service = new TranscriptService(prisma as never, stt as never);
      return { service, prisma, created };
    };

    it('120セグメントでも接続を1本しか使わない（個別 create を呼ばない）', async () => {
      const { service, prisma } = buildService();

      await service.finalizeFromAudio('consultation-1', Buffer.from('audio'));

      // 1件ずつの create は二度と使わない。これが 15本のプールを食い潰していた
      expect(prisma.transcriptSegment.create).not.toHaveBeenCalled();
      expect(prisma.transcriptSegment.createMany).toHaveBeenCalledTimes(1);
      // 削除と一括作成が1トランザクション＝1接続にまとまっている
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction.mock.calls[0]![0]).toHaveLength(2);
    });

    it('セグメントは順番どおり一括で入る', async () => {
      const { service, created } = buildService();

      await service.finalizeFromAudio('consultation-1', Buffer.from('audio'));

      const args = created[0] as { data: Array<{ sequenceNumber: number; consultationId: string }> };
      expect(args.data).toHaveLength(120);
      expect(args.data[0]!.sequenceNumber).toBe(0);
      expect(args.data[119]!.sequenceNumber).toBe(119);
      expect(args.data.every((d) => d.consultationId === 'consultation-1')).toBe(true);
    });
  });
});
