import { audioToRecordingMs, looksLikePromptEcho, pcm16Base64 } from './live-stream';

describe('ストリーミング表示の部品', () => {
  it('音を16bitに直してbase64にする', () => {
    const b64 = pcm16Base64(Float32Array.from([0, 1, -1]));
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    expect(bytes).toHaveLength(6);
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(0, true)).toBe(0);
    expect(view.getInt16(2, true)).toBe(0x7fff);
    expect(view.getInt16(4, true)).toBe(-0x8000);
  });

  it('流した音の時間を、一時停止をまたいで録音の時間へ戻す', () => {
    // 音の0〜5000msは録音の1000〜6000ms。そのあと一時停止して、録音の20000msから再開
    const marks = [
      { audioMs: 0, recMs: 1000 },
      { audioMs: 5000, recMs: 20000 },
    ];
    expect(audioToRecordingMs(marks, 2000)).toBe(3000);
    expect(audioToRecordingMs(marks, 5500)).toBe(20500);
  });

  it('ヒントの写しは弾き、普通の文は残す', () => {
    const prompt = '内科診察の会話。エンレスト、ビソプロロール、ジャディアンス';
    expect(looksLikePromptEcho('内科診察の会話。エンレスト、ビソプロロール', prompt)).toBe(true);
    expect(looksLikePromptEcho('エンレストは続けられていますか？', prompt)).toBe(false);
    expect(looksLikePromptEcho('はい', prompt)).toBe(false);
  });
});
