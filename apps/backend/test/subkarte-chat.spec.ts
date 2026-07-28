import { MockLlmProvider } from '../src/providers/ai/llm.provider';

describe('MockLlmProvider.subkarteChat', () => {
  const provider = new MockLlmProvider();
  const context = {
    soap: {
      subjective: '咳',
      objective: '聴診異常なし',
      assessment: '感冒疑い',
      plan: '経過観察',
    },
    note: '',
    documents: {
      referral: { recipientHospital: '旧病院', diagnosis: '感冒' },
    },
  };

  it('records note-only messages without patches', async () => {
    const result = await provider.subkarteChat!(
      'system',
      [{ role: 'user', content: '気管支炎の疑いがある' }],
      context,
    );
    expect(result.reply).toContain('記録');
    expect(result.soapPatch).toBeUndefined();
    expect(result.documentPatches).toBeUndefined();
  });

  it('patches assessment on edit-like Assessment messages', async () => {
    const result = await provider.subkarteChat!(
      'system',
      [{ role: 'user', content: 'Assessment に副鼻腔炎の疑いを追記' }],
      context,
    );
    expect(result.soapPatch?.assessment).toContain('副鼻腔炎');
  });

  it('patches referral hospital on 宛先 messages', async () => {
    const result = await provider.subkarteChat!(
      'system',
      [{ role: 'user', content: '紹介状の宛先を市立中央病院に' }],
      context,
    );
    expect(result.documentPatches?.[0]?.type).toBe('referral');
    expect(result.documentPatches?.[0]?.content.recipientHospital).toBe('市立中央病院');
  });
});
