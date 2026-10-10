/**
 * 診察の言い回しを変えた、合成の短い会話。Oの定型を入れてよいかの判定（exam-events.ts）を測る。
 *
 * expect は部位ごとの正解。書いていない部位は 'none'（診察していない）。
 *   normal   … 診察して、医師が異常なしと述べた → 定型を入れてよい
 *   unstated … 診察の動作はあるが、結果の発話が無い → 「未確認」で入れる
 *   abnormal … 医師が異常を述べた → 定型は入れない
 *   none     … 診察していない → 絶対に入れない
 *
 * 合成なので、実診察の言い回しの全体を代表しない。実診察の診察まわりの発話を足していく。
 */
export type ExamExpect = Partial<Record<'pulse' | 'anemia_jaundice' | 'heart' | 'lung', 'normal' | 'unstated' | 'abnormal'>>;
export type ExamCase = { id: string; label: string; transcript: string; expect: ExamExpect };

const t = (...lines: string[]) => lines.join('\n');

export const POSITIVE: ExamCase[] = [
  { id: 'P01', label: '心臓の音を聞く＋きれい', transcript: t('医師: 今日はちょっと心臓の音、聞いてみますね。', '医師: はい、きれいな音ですね。大丈夫ですね。', '患者: ありがとうございます。'), expect: { heart: 'normal' } },
  { id: 'P02', label: '胸の音＋問題ない（部位は胸一般）', transcript: t('医師: 胸の音を聞かせてください。', '医師: 問題ないですね。', '医師: お薬はいつものを出しておきますね。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'P03', label: '聴診器を当てる＋大丈夫', transcript: t('医師: シャツを上げてもらえますか。聴診器当てますね。', '患者: はい。', '医師: はい、大丈夫です。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'P04', label: '深呼吸＋雑音ない', transcript: t('医師: 深呼吸してください。吸ってー、吐いてー。', '医師: はい、雑音ないですね。'), expect: { lung: 'normal' } },
  { id: 'P05', label: '背中の音＋きれい', transcript: t('医師: 背中の音も聞きますね。', '患者: お願いします。', '医師: きれいですね。'), expect: { lung: 'normal' } },
  { id: 'P06', label: '脈をとる＋整', transcript: t('医師: 脈をとりますね。', '医師: 脈は整ですね。'), expect: { pulse: 'normal' } },
  { id: 'P07', label: '目の下を見る＋貧血なし', transcript: t('医師: ちょっと目の下を見せてもらえますか。', '医師: 貧血はなさそうですね。'), expect: { anemia_jaundice: 'normal' } },
  { id: 'P08', label: '白目＋黄疸なし', transcript: t('医師: 白目の色を見ますね。', '医師: 黄疸はないですね。'), expect: { anemia_jaundice: 'normal' } },
  { id: 'P09', label: '心臓の音を聞く（結果なし）', transcript: t('医師: 心臓の音を聞きますね。', '患者: はい。', '医師: じゃあ今日のお薬ですが、いつものを30日分出しますね。'), expect: { heart: 'unstated' } },
  { id: 'P10', label: '背中を向けて聞く（結果なし）', transcript: t('医師: 背中を向けてください。聞きますね。', '患者: はい。', '医師: では次回は一か月後に来てください。'), expect: { lung: 'unstated' } },
  { id: 'P11', label: '心臓の音＋雑音あり', transcript: t('医師: 心臓の音聞きますね。', '医師: 少し雑音がありますね。前から指摘されていますか。'), expect: { heart: 'abnormal' } },
  { id: 'P12', label: '背中の音＋ゼーゼー', transcript: t('医師: 背中の音を聞きますね。', '医師: 少しゼーゼーしてますね。'), expect: { lung: 'abnormal' } },
  { id: 'P13', label: 'ひらがなの言い回し', transcript: t('医師: ちょっとしんぞうの音、きかせてくださいね。', '医師: うん、いいですよ。'), expect: { heart: 'normal' } },
  { id: 'P14', label: '血圧と脈を測る', transcript: t('医師: 血圧と脈、測りますね。', '医師: 血圧は128の78ですね。脈も整ですね。'), expect: { pulse: 'normal' } },
  { id: 'P15', label: '手首で脈（結果なし）', transcript: t('医師: 手首で脈を診ますね。', '患者: はい。', '医師: それでは今日は終わりにしましょう。'), expect: { pulse: 'unstated' } },
  { id: 'P16', label: 'まぶた＋色がきれい', transcript: t('医師: まぶたを下げて、あっかんべーしてください。', '医師: うん、きれいな色ですね。'), expect: { anemia_jaundice: 'normal' } },
  { id: 'P17', label: '聴診しますね＋大丈夫', transcript: t('医師: 聴診しますね。', '医師: はい、大丈夫です。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'P18', label: '肺の音＋きれい', transcript: t('医師: 肺の音聞きますね。', '医師: きれいですね。'), expect: { lung: 'normal' } },
  { id: 'P19', label: '心音も呼吸音も問題ない', transcript: t('医師: 聴診しました。心音も呼吸音も問題ないですね。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'P20', label: '胸の方を聞かせてもらう＋いいですね', transcript: t('医師: では胸の方、聞かせてもらいますね。', '医師: はい、いいですね。そのまま続けましょう。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'P21', label: '心臓だけ聞く（肺は聞いていない）', transcript: t('医師: 心臓の音を聞きますね。', '医師: きれいです。'), expect: { heart: 'normal' } },
  { id: 'P22', label: '聞きますねの途中で患者が話す', transcript: t('医師: はい、じゃあ心臓の音聞きますねー。', '患者: あ、先生、血圧の薬なんですけど。', '医師: はいはい、あとで伺いますね。'), expect: { heart: 'unstated' } },
  { id: 'P23', label: '異常ないですね', transcript: t('医師: 聴診器当てますね。', '医師: 異常ないですね。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'P24', label: '心配ないですね', transcript: t('医師: ちょっと胸の音聞きますね。', '患者: はい。', '医師: 心配ないですね。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'P25', label: '呼吸の音＋雑音なし', transcript: t('医師: 呼吸の音を聞かせてください。', '医師: 雑音は無いですね。'), expect: { lung: 'normal' } },
  { id: 'P26', label: '脈を取る（結果なし）＋雑談', transcript: t('医師: 脈をとらせてくださいね。', '患者: 最近暑いですね。', '医師: そうですね。'), expect: { pulse: 'unstated' } },
  { id: 'P27', label: '服を上げて胸の音＋大丈夫', transcript: t('医師: 服を上げてもらっていいですか。胸の音聞きます。', '医師: 大丈夫そうですね。'), expect: { heart: 'normal', lung: 'normal' } },
];

export const NEGATIVE: ExamCase[] = [
  { id: 'N01', label: '患者の胸の痛みの訴え', transcript: t('患者: 最近、胸が痛いんです。', '医師: いつからですか。', '患者: 先週からです。'), expect: {} },
  { id: 'N02', label: '薬の話の「大丈夫」', transcript: t('医師: お薬は飲めていますか。', '患者: はい、飲めてます。', '医師: 大丈夫ですね。続けましょう。'), expect: {} },
  { id: 'N03', label: '前回の聴診の話', transcript: t('医師: 前回聴診したときは異常なかったですね。', '患者: そうでしたね。', '医師: 今日は問診だけにしましょう。'), expect: {} },
  { id: 'N04', label: '今日は聴診しない', transcript: t('医師: 今日は聴診はしませんね。', '患者: はい。', '医師: お薬を出しておきます。'), expect: {} },
  { id: 'N05', label: '家で脈を測っているか', transcript: t('医師: 家で脈を測っていますか。', '患者: 測っていません。', '医師: 測るようにしてくださいね。'), expect: {} },
  { id: 'N06', label: '他院で聞いてもらった話', transcript: t('患者: この前の病院で心臓の音を聞いてもらって、異常ないと言われました。', '医師: そうでしたか。'), expect: {} },
  { id: 'N07', label: '心臓の病気の一般的な話', transcript: t('医師: 心臓の病気は心配ないですね。', '患者: 安心しました。'), expect: {} },
  { id: 'N08', label: '呼吸が苦しいときは教えて', transcript: t('医師: 呼吸が苦しいときは教えてください。', '患者: はい。'), expect: {} },
  { id: 'N09', label: '貧血の血液検査を出す', transcript: t('医師: 貧血の検査をしておきましょう。採血しますね。', '患者: はい。'), expect: {} },
  { id: 'N10', label: '脈が速くなるかの問診', transcript: t('医師: 脈が速くなるときはありますか。', '患者: たまにあります。', '医師: どのくらい続きますか。'), expect: {} },
  { id: 'N11', label: '血圧の薬を続ける', transcript: t('医師: 血圧の薬は続けましょう。大丈夫ですね。', '患者: はい。'), expect: {} },
  { id: 'N12', label: '患者の背中の痛み', transcript: t('患者: 背中が痛くて。', '医師: いつからですか。', '患者: 三日前からです。'), expect: {} },
  { id: 'N13', label: '咳の問診', transcript: t('医師: 咳は夜に出ますか。', '患者: 夜に出ます。'), expect: {} },
  { id: 'N14', label: '会計前のあいさつ', transcript: t('医師: はい、お薬出しておきますね。大丈夫ですね。お大事に。', '患者: ありがとうございました。'), expect: {} },
  { id: 'N15', label: '聞いてほしい→次回にする', transcript: t('患者: 胸の音を聞いてもらってもいいですか。', '医師: 今日は時間がないので次回にしましょう。'), expect: {} },
  { id: 'N16', label: '心エコーを予約', transcript: t('医師: 心臓の音を見る検査として、心エコーを予約しておきますね。', '患者: お願いします。'), expect: {} },
  { id: 'N17', label: '目の症状の問診', transcript: t('医師: 目の症状は大丈夫ですか。', '患者: 特にないです。'), expect: {} },
  { id: 'N18', label: 'レントゲンの結果', transcript: t('医師: 胸の写真は異常ないですね。', '患者: よかったです。'), expect: {} },
  { id: 'N19', label: '心電図の結果', transcript: t('医師: 心電図は異常ないですね。', '患者: はい。'), expect: {} },
  { id: 'N20', label: '薬で脈を整える', transcript: t('医師: お薬で脈を整えましょう。', '患者: お願いします。'), expect: {} },
  { id: 'N21', label: '家族が話す息苦しさ', transcript: t('患者: 母が最近、息が苦しいみたいで。', '医師: そうなんですね。いつからですか。'), expect: {} },
  { id: 'N22', label: '白目の変化の問診', transcript: t('医師: 白目が黄色くなったりしていませんか。', '患者: ないです。'), expect: {} },
  { id: 'N23', label: '予防接種前の「大丈夫ですね」', transcript: t('医師: 大丈夫ですね、腕を出してください。', '患者: はい。'), expect: {} },
  { id: 'N24', label: '患者が聞く「心臓は大丈夫ですか」（答えは検査）', transcript: t('患者: 先生、私の心臓は大丈夫でしょうか。', '医師: 一度、心電図を撮ってみましょう。'), expect: {} },
  { id: 'N25', label: '生活指導だけ', transcript: t('医師: 麺類と揚げ物が同じ日に重なっていますね。', '患者: そうですね。', '医師: どちらか一食だけにして、分散させましょう。'), expect: {} },
  { id: 'N26', label: '胸やけの問診', transcript: t('医師: 胸やけはありますか。', '患者: 食後にあります。', '医師: お薬を出しましょう。'), expect: {} },
  { id: 'N27', label: '脈拍のお薬の説明', transcript: t('医師: このお薬は脈拍を抑える働きがあります。', '患者: わかりました。'), expect: {} },
];

/**
 * プロンプトを直し終えたあとに足した、未見の会話。プロンプトの例と重ならない言い回しで書いてある。
 * 直した会話で測った数字は甘くなるので、この組は **直さずに** 測る。
 */
export const HELDOUT: ExamCase[] = [
  { id: 'H01', label: '聴診器を胸に当てさせてもらう＋ノイズなし', transcript: t('医師: 胸に聴診器を当てさせていただきますね。', '患者: はい。', '医師: ノイズはないですね。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'H02', label: '脈が飛ぶ（異常）', transcript: t('医師: 脈を診ますね。', '医師: 今日は脈が少し飛んでますね。'), expect: { pulse: 'abnormal' } },
  { id: 'H03', label: '服を戻してくださいで終わる', transcript: t('医師: ちょっと聞きますね。シャツの下から失礼します。', '患者: はい。', '医師: いいですよ、服を戻してください。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'H04', label: '結膜を見る（貧血っぽさなし）', transcript: t('医師: 下まぶたの裏を見せてもらえますか。', '医師: 赤みはしっかりありますね。貧血っぽさはないです。'), expect: { anemia_jaundice: 'normal' } },
  { id: 'H05', label: '息を楽にして聞く（結果なし）', transcript: t('医師: 息は楽にしていてくださいね。聞いていきます。', '患者: はい。', '医師: お薬の説明をしますね。'), expect: { lung: 'unstated' } },
  { id: 'H06', label: '背中＋ラ音', transcript: t('医師: 背中から聞きますね。', '医師: 右の下の方で少し音が濁ってますね。'), expect: { lung: 'abnormal' } },
  { id: 'H07', label: '診察後にまとめて異常なし', transcript: t('医師: 胸も背中も一通り聞きましたけど、特に問題ないですね。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'H08', label: '手首を触って脈＋不整なし', transcript: t('医師: 手首、失礼しますね。', '医師: 不整はないですね。'), expect: { pulse: 'normal' } },
  { id: 'H09', label: '白目の黄染なし', transcript: t('医師: 目を大きく開けてもらえますか。', '医師: 黄色みはないですね。'), expect: { anemia_jaundice: 'normal' } },
  { id: 'H10', label: '心臓の聴診＋患者質問に答える', transcript: t('医師: 心臓の方を聞きますね。', '患者: 先生、動悸があるんですが。', '医師: うん、音は問題なさそうですよ。'), expect: { heart: 'normal' } },
];

export const HELDOUT_NEGATIVE: ExamCase[] = [
  { id: 'HN01', label: '体温を測る（4部位ではない）', transcript: t('医師: 熱を測りますね。', '医師: 36度ですね。大丈夫ですね。'), expect: {} },
  { id: 'HN02', label: '血圧だけ測る', transcript: t('医師: 血圧を測りますね。', '医師: 上が128ですね。大丈夫ですね。'), expect: {} },
  { id: 'HN03', label: '患者のどきどきの訴え', transcript: t('患者: 心臓の音が聞こえるくらいドキドキするんです。', '医師: それはいつ頃ですか。'), expect: {} },
  { id: 'HN04', label: '聴診器の世間話', transcript: t('患者: 先生、その聴診器かっこいいですね。', '医師: ありがとうございます。', '医師: お薬の話に戻りましょうか。'), expect: {} },
  { id: 'HN05', label: '診察室へ案内', transcript: t('医師: 診察室にお入りください。', '患者: はい。', '医師: おかけください。'), expect: {} },
  { id: 'HN06', label: 'ゆっくり呼吸して話す', transcript: t('医師: ゆっくり話してくださいね。落ち着いていきましょう。', '患者: はい。'), expect: {} },
  { id: 'HN07', label: '背中のストレッチ指導', transcript: t('医師: 背中を丸めない姿勢を意識してくださいね。', '患者: はい、やってみます。'), expect: {} },
  { id: 'HN08', label: '腹部の問診', transcript: t('医師: お腹の調子はどうですか。', '患者: 少し下しています。'), expect: {} },
  { id: 'HN09', label: '前の先生の指摘', transcript: t('患者: 前の先生に、脈が不整だと言われました。', '医師: そうでしたか。心電図を撮りましょう。'), expect: {} },
  { id: 'HN10', label: '採血・検査の結果の説明', transcript: t('医師: ヘモグロビンは問題ないですね。貧血はありません。', '患者: よかったです。'), expect: {} },
];

/**
 * HELDOUT で見つかった取りこぼしを受けてプロンプトを直した**あとに**、さらに足した未見の会話。
 * HELDOUT は一度見てしまったので、調整後の数字はこちらで判断する。
 */
export const FRESH: ExamCase[] = [
  { id: 'F01', label: '横になって胸を診る＋胸は問題ない', transcript: t('医師: ベッドに横になってください。お腹と胸、診ますね。', '医師: 胸の方は問題ないですね。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'F02', label: '聴診器が冷たい＋OKです', transcript: t('医師: 聴診器、冷たいですけど失礼しますね。', '患者: はい。', '医師: はい、OKです。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'F03', label: '動作なしで心臓の雑音', transcript: t('医師: 心臓の方の音ですが、ちょっとだけ雑音が混じってますね。', '患者: そうですか。'), expect: { heart: 'abnormal' } },
  { id: 'F04', label: '脈拍を確認＋規則正しい', transcript: t('医師: 脈拍を確認しますね。', '医師: 規則正しいですね。'), expect: { pulse: 'normal' } },
  { id: 'F05', label: 'まぶたの裏＋貧血は大丈夫', transcript: t('医師: あ、まぶたの裏、ちょっと見ますね。', '医師: 貧血は大丈夫そうです。'), expect: { anemia_jaundice: 'normal' } },
  { id: 'F06', label: '肺の方を聞いていく（結果なし）', transcript: t('医師: 肺の方、聞いていきますね。', '患者: 最近寒くなってきましたね。', '医師: そうですね、ご自愛ください。'), expect: { lung: 'unstated' } },
  { id: 'F07', label: '深呼吸3回＋結構です', transcript: t('医師: 深呼吸を3回お願いします。', '医師: はい、結構です。'), expect: { lung: 'normal' } },
  { id: 'F08', label: '喉を見て赤みなし＋胸の音（結果なし）', transcript: t('医師: 喉も見ますね。あーんしてください。', '医師: 赤みはないですね。', '医師: 胸の音も聞きますね。', '患者: はい。'), expect: { heart: 'unstated', lung: 'unstated' } },
  { id: 'F09', label: '聴診の結果、問題なし', transcript: t('医師: 聴診の結果、問題なしですね。'), expect: { heart: 'normal', lung: 'normal' } },
  { id: 'F10', label: '手首を触って脈＋リズムは問題なし', transcript: t('医師: 手首を触らせてくださいね。', '医師: リズムは問題ないですね。'), expect: { pulse: 'normal' } },
];

export const FRESH_NEGATIVE: ExamCase[] = [
  { id: 'FN01', label: '服装の質問', transcript: t('医師: シャツの下には何を着ていますか。', '患者: 肌着だけです。'), expect: {} },
  { id: 'FN02', label: '点滴中に目を閉じる', transcript: t('医師: 点滴の間、目を閉じて休んでいてくださいね。', '患者: はい。'), expect: {} },
  { id: 'FN03', label: '時計で脈を知る指導', transcript: t('医師: 手首に時計をつけておくと、脈の様子が分かりますよ。', '患者: やってみます。'), expect: {} },
  { id: 'FN04', label: '息を吸うと痛いかの問診', transcript: t('医師: 息を吸うと痛いですか。', '患者: 少し痛いです。'), expect: {} },
  { id: 'FN05', label: '健診で聴診は問題なしと言われた', transcript: t('患者: 先月の健診で、聴診は問題ないと言われました。', '医師: そうでしたか。'), expect: {} },
  { id: 'FN06', label: 'ベッドで点滴', transcript: t('医師: ベッドに横になってください。点滴をしますね。', '患者: お願いします。'), expect: {} },
  { id: 'FN07', label: '診察終わりの確認', transcript: t('医師: 診察は終わりです。何か心配なことはありますか。', '患者: 大丈夫です。', '医師: 大丈夫ですね。お大事に。'), expect: {} },
  { id: 'FN08', label: '運動の話', transcript: t('医師: 心臓に負担をかけない運動を続けてくださいね。', '患者: ウォーキングですね。'), expect: {} },
];
