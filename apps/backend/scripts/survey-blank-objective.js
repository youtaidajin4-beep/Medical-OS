/**
 * SOAPのOが空欄になった診察の内訳を、件数だけで出す（読み取り専用。会話・SOAPの本文は出力しない）。
 *
 *   cd apps/backend && export PATH="$HOME/node/bin:$PATH" && node scripts/survey-blank-objective.js
 *
 * DATABASE_URL は環境変数、無ければ ../../.local/backend.production.env から読む。
 * 内訳は、空欄になる経路（soap-floor-gate.ts・pipeline の材料不足）のどれに当たるかで分ける。
 */
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  const file = path.join(__dirname, '../../../.local/backend.production.env');
  const m = fs.readFileSync(file, 'utf8').match(/^DATABASE_URL=(.*)$/m);
  if (!m) throw new Error('DATABASE_URL が見つかりません');
  process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, '');
}
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// soap-floor-gate.ts の AUSCULTATION_CUES と同じ
const CUE = /聴診|胸の音|心音|呼吸音|背中|背部|深呼吸|息を吸|息を吐|脈を|脈拍|血圧を測|お腹を診|腹部を診/;
// 判定語を広げた場合に当たる語（案Bの見積り用）
const WIDE = /触診|視診|診ま|診て|見せて|見ま|触|お腹|腹部|喉|のど|口を開|あーん|ベッド|横に|むくみ|浮腫|足を|脈|血圧|熱を|測り|測っ|聞きま|聞かせ|胸/;
const blank = (x) => !String(x || '').replace(/[\s。、]/g, '');

(async () => {
  const cons = await p.consultation.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      soapDocuments: { orderBy: { version: 'desc' }, take: 1 },
      transcriptSegments: { where: { isFinal: true }, select: { text: true } },
      aiExecutions: {
        where: { step: { in: ['soap_floor_withheld', 'soap_complete'] } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  const rows = [];
  for (const c of cons) {
    const s = c.soapDocuments[0];
    if (!s) continue;
    const text = c.transcriptSegments.map((x) => x.text).join('\n');
    const soapC = [...c.aiExecutions].reverse().find((e) => e.step === 'soap_complete');
    const withheld = c.aiExecutions.filter((e) => e.step === 'soap_floor_withheld').map((e) => e.errorMessage || '');
    rows.push({
      id: c.id.slice(0, 8),
      at: c.createdAt.toISOString().slice(0, 16),
      type: c.visitType,
      oBlank: blank(s.objective),
      allBlank: blank(s.subjective) && blank(s.objective) && blank(s.assessment) && blank(s.plan),
      chars: text.length,
      cue: CUE.test(text),
      wide: WIDE.test(text),
      skipped: soapC && soapC.status === 'skipped',
      withheldO: withheld.some((m) => m.includes('objective')),
    });
  }
  const blanks = rows.filter((r) => r.oBlank);
  const tally = (f) => blanks.reduce((o, r) => ((o[f(r)] = (o[f(r)] || 0) + 1), o), {});
  console.log(`診察（SOAPあり） ${rows.length} 件 / Oが空欄 ${blanks.length} 件`);
  console.log('空欄の理由:', tally((r) => (r.allBlank || r.skipped ? '材料不足（全欄空）' : r.withheldO ? '定型を入れなかった（聴診の印なし）' : r.cue ? '聴診の印はあるのに空' : 'その他（印なし・ログなし）')));
  console.log('診察種別:', tally((r) => r.type));
  console.log('聴診の印あり:', tally((r) => r.cue), ' 判定語を広げると当たる:', tally((r) => r.wide));
  console.log('\n空欄の診察（本文は出さない）');
  blanks.forEach((r) => console.log(JSON.stringify(r)));
  await p.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
