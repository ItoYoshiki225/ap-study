// 試験の基本情報（2026年11月時点・IPA公式情報より）
window.EXAM = {
  updated: "2026-11-22",
  // カウントダウン対象（令和8年度 後期 科目A 開始日）
  target: { label: "後期 科目A 開始", date: "2027-02-06" },
  schedule: [
    { term: "令和8年度 前期", apply: "2026/10/6(火) 〜 11/7(土)", a: "2026/10/28(水) 〜 11/10(火)", b: "2026/11/24(火) 〜 12/6(日)", result: "2027年2月頃", note: "申込締切済み" },
    { term: "令和8年度 後期", apply: "2027/1/27(水) 〜 2/16(火)", a: "2027/2/6(土) 〜 2/19(金)", b: "2027/3/3(水) 〜 3/15(月)", result: "2027年6月頃", note: "現行の応用情報 最終回" }
  ],
  format: [
    { name: "科目A（旧 午前）", time: "150分", type: "多肢選択式（四肢択一）", q: "80問出題・80問解答", pass: "100点満点中 60点以上" },
    { name: "科目B（旧 午後）", time: "150分", type: "記述式", q: "11問出題・5問解答（問1必須＋4問選択）", pass: "100点満点中 60点以上" }
  ],
  fee: "7,500円（税込）",
  fields: {
    tech:  { name: "テクノロジ系", cls: "tech",  aCount: 50 },
    mgmt:  { name: "マネジメント系", cls: "mgmt", aCount: 10 },
    strat: { name: "ストラテジ系", cls: "strat", aCount: 20 }
  },
  bFields: [
    { no: 1, name: "情報セキュリティ", must: true },
    { no: 2, name: "経営戦略" },
    { no: 3, name: "プログラミング（アルゴリズム）" },
    { no: 4, name: "システムアーキテクチャ" },
    { no: 5, name: "ネットワーク" },
    { no: 6, name: "データベース" },
    { no: 7, name: "組込みシステム開発" },
    { no: 8, name: "情報システム開発" },
    { no: 9, name: "プロジェクトマネジメント" },
    { no: 10, name: "サービスマネジメント" },
    { no: 11, name: "システム監査" }
  ],
  sources: [
    ["IPA 応用情報技術者試験", "https://www.ipa.go.jp/shiken/kubun/ap.html"],
    ["IPA 令和8年度 申込受付期間及び試験実施期間", "https://www.ipa.go.jp/shiken/2026/ap_koudo_sc_kikan.html"],
    ["IPA CBT方式での実施について", "https://www.ipa.go.jp/shiken/2026/ap_koudo_sc-cbt.html"],
    ["IPA 試験の見直しの検討状況（2027年度〜新制度）", "https://www.ipa.go.jp/shiken/syllabus/henkou/2025/20260331.html"]
  ]
};
window.UNITS = [];
