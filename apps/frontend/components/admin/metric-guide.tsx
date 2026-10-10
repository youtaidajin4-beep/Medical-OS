import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 「この数字は何を測っていて、どう読むか」。数字だけが一人歩きしないよう、画面の中に置く。
 * 正本は 07_ROADMAP/10_quality_measurement.md（こちらを変えたら向こうも直す）。
 */
const ROWS: Array<{ name: string; what: string; basis: string; read: string }> = [
  {
    name: '発話の再現率',
    what: '録音全体を文字にしたもの（基準）の文字2連のうち、診察中の文字起こしに残った割合',
    basis: '診察中の文字起こし（gpt-4o-mini-transcribe＋語彙）と、録音全体の文字起こし（gpt-4o-transcribe-diarize）の比較',
    read: '低いほど、SOAPの材料そのものが欠けている。S・Oの抜け漏れは、まずここを疑う。一致率が低いときは、言い換えや幻聴が多い',
  },
  {
    name: '医療用語の回収率',
    what: '基準に出た辞書の語（病名・症状・所見・薬・検査・画像・処置）のうち、診察中の文字起こしにも出た割合',
    basis: '補正後＝SOAPの材料になった文字。補正前＝音声認識そのまま。差が辞書補正の効き',
    read: '補正後が補正前より高ければ辞書が効いている。両方低いなら、語彙ヒントの渡し方か音声認識の側',
  },
  {
    name: 'SOAPの転記率',
    what: '会話に出た診療上の事実のうち、SOAPに書かれた割合。会話に根拠のない記載の数も出す',
    basis: 'LLM（gpt-4o）が3段で判定：①会話だけから事実を挙げる ②その事実がSOAPにあるか ③SOAPの記載に会話の根拠があるか',
    read: '人が的を付けた評価（eval）とは物差しが違い、判定のほうが低めに出る（較正：同じSOAPで人65%・判定約49%）。SOAPを半分に削ると約半分に下がる。根拠なしは、足した捏造の約半数を拾い、原文でも1〜2件誤って挙げる。絶対値ではなく月の動きで読む',
  },
  {
    name: '先生の修正',
    what: '先生がSOAP・診療録・文字起こしを直した回数（1診察あたり）',
    basis: '修正履歴（RevisionHistory）',
    read: '少ないほど、そのまま使えている。AIの指標と逆に動いたら、AIの指標のほうを疑う',
  },
];

export function MetricGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">この数字の読み方</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700">
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900 ring-1 ring-inset ring-amber-200">
          正解データのない本番では、<strong>基準との比</strong>しか測れません。基準（録音全体の文字起こし）も正解ではないので、
          数字の絶対値ではなく、<strong>構成を変えた前後の動き</strong>を見てください。割合は診察の合算で、
          診察が少ない月は±数ポイント動きます。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-medium">指標</th>
                <th className="py-2 pr-3 font-medium">何を測るか</th>
                <th className="py-2 pr-3 font-medium">何と比べるか</th>
                <th className="py-2 font-medium">読み方</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {ROWS.map((r) => (
                <tr key={r.name}>
                  <th scope="row" className="py-2 pr-3 font-semibold text-slate-900">
                    {r.name}
                  </th>
                  <td className="py-2 pr-3">{r.what}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.basis}</td>
                  <td className="py-2 text-slate-600">{r.read}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          数字は診察の終了後に自動で積まれます（録音全体の文字起こしは録音が届いてから、SOAPの判定はSOAPができてから）。
          どちらかが測れなかった診察は、測れた指標だけが入ります。測れなかった理由は診察の行に出ます。
        </p>
      </CardContent>
    </Card>
  );
}
