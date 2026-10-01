import { RecordingService } from '../src/modules/recording/recording.service';

/**
 * 2026-09-28、谷口先生の池田さんの診察。
 *
 * > 診察後に採血して頂き、その結果と治療方針を同日に説明したのですが、採血時にいったん
 * > 退室されるため、終了ではなく、一時停止の機能などが必要かと思いました。
 * > 採血している間に他の患者さんの診療も行うので。
 *
 * 画面の一時停止ボタンでは足りない。別の患者さんの画面へ移った時点で、その録音は続かない。
 * 前半を残したまま録り足し、止めたときに1本につないで文字起こしからやり直す。
 *
 * ここで固定するのは、録り足しで前半を壊さないこと。
 */
describe('同じ診察の続きを録る', () => {
  function makeService() {
    const chunks: Array<{ id: string; sequenceNumber: number; storageKey: string }> = [];
    const files: Array<{ id: string; storageKey: string; deletedAt: Date | null }> = [];
    const deletedKeys: string[] = [];
    const putKeys: string[] = [];

    const prisma = {
      audioChunk: {
        findFirst: jest.fn(async ({ orderBy }: { orderBy?: { sequenceNumber?: string } }) => {
          if (!chunks.length) return null;
          const sorted = [...chunks].sort((a, b) =>
            orderBy?.sequenceNumber === 'desc'
              ? b.sequenceNumber - a.sequenceNumber
              : a.sequenceNumber - b.sequenceNumber,
          );
          return sorted[0];
        }),
        findMany: jest.fn(async () =>
          [...chunks].sort((a, b) => a.sequenceNumber - b.sequenceNumber),
        ),
        findUnique: jest.fn(async ({ where }: never) => {
          const seq = (where as { consultationId_sequenceNumber: { sequenceNumber: number } })
            .consultationId_sequenceNumber.sequenceNumber;
          return chunks.find((c) => c.sequenceNumber === seq) ?? null;
        }),
        delete: jest.fn(async ({ where }: { where: { id: string } }) => {
          const i = chunks.findIndex((c) => c.id === where.id);
          if (i >= 0) chunks.splice(i, 1);
        }),
        create: jest.fn(async ({ data }: { data: { sequenceNumber: number; storageKey: string } }) => {
          const row = { id: `chunk-${data.sequenceNumber}`, ...data };
          chunks.push(row);
          return row;
        }),
      },
      audioFile: {
        findMany: jest.fn(async () => files.filter((f) => !f.deletedAt)),
        update: jest.fn(async ({ where }: { where: { id: string } }) => {
          const f = files.find((x) => x.id === where.id);
          if (f) f.deletedAt = new Date();
        }),
      },
    };

    const storage = {
      put: jest.fn(async (key: string) => {
        putKeys.push(key);
      }),
      delete: jest.fn(async (key: string) => {
        deletedKeys.push(key);
      }),
      get: jest.fn(),
    };

    const service = new RecordingService(
      prisma as never,
      storage as never,
      { processPreviewChunk: jest.fn(async () => undefined) } as never,
      { assemble: jest.fn() } as never,
    );
    return { service, chunks, files, deletedKeys, putKeys };
  }

  it('前半を1本にまとめた後、続きは次の番号から始まる', async () => {
    const { service, chunks } = makeService();
    await service.uploadFinalRecording('c1', Buffer.from('前半'), undefined, 0);
    expect(chunks.map((c) => c.sequenceNumber)).toEqual([0]);
    await expect(service.nextSequenceNumber('c1')).resolves.toBe(1);
  });

  it('続きを1本にまとめても、前半のチャンクは消えない', async () => {
    const { service, chunks } = makeService();
    await service.uploadFinalRecording('c1', Buffer.from('前半'), undefined, 0);
    // 後半の録音中に届く細切れ
    await service.uploadChunk('c1', 1, Buffer.from('後半a'));
    await service.uploadChunk('c1', 2, Buffer.from('後半b'));
    // 後半を止めたとき、この回のぶんだけ1本へ置き換える
    await service.uploadFinalRecording('c1', Buffer.from('後半'), undefined, 1);

    expect(chunks.map((c) => c.sequenceNumber).sort()).toEqual([0, 1]);
  });

  it('まとめ済みの音声は捨てる。残っていると前半だけで文字起こしをやり直してしまう', async () => {
    const { service, files, deletedKeys } = makeService();
    files.push({ id: 'f1', storageKey: 'c1/full.wav', deletedAt: null });
    await service.uploadFinalRecording('c1', Buffer.from('後半'), undefined, 1);
    expect(deletedKeys).toContain('c1/full.wav');
    expect(files[0]!.deletedAt).not.toBeNull();
  });

  it('0から振り直すと前半が消えることを、番号の性質として示す', async () => {
    const { service, chunks } = makeService();
    await service.uploadFinalRecording('c1', Buffer.from('前半'), undefined, 0);
    // uploadChunk は同じ番号を「再送」とみなして既存を返す（新しい音声は書かれない）。
    // だから続きは必ず nextSequenceNumber から始める
    const again = await service.uploadChunk('c1', 0, Buffer.from('後半'));
    expect(again.sequenceNumber).toBe(0);
    expect(chunks).toHaveLength(1);
  });
});
