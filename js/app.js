/* 応用情報 合格ノート — 画面ロジック（依存ライブラリなし） */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const KANA = ["ア", "イ", "ウ", "エ"];
  const E = window.EXAM;
  const UNITS = window.UNITS;
  const B = window.KAMOKU_B || [];

  // 各問題にIDと単元情報を付与
  UNITS.forEach(u => u.quiz.forEach((q, i) => { q.id = `${u.id}-${i}`; q.unit = u.id; q.field = u.field; }));
  const ALL_Q = UNITS.flatMap(u => u.quiz);
  const unitById = Object.fromEntries(UNITS.map(u => [u.id, u]));

  /* ---------- 保存データ ---------- */
  const KEY = "ap-study-v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  let S = Object.assign({ done: {}, best: {}, wrong: {}, history: [], theme: null }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  /* ---------- 共通 ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // 選択肢を毎回シャッフル（位置の暗記を防ぐ）。解説中の「アは〜」などの記号も付け替える
  const view = q => {
    const perm = shuffle([0, 1, 2, 3]);
    const e = q.e.replace(/(^|[。、・（ら])([アイウエ])(?=[は・（）])/g, (m, p, k) => p + KANA[perm.indexOf(KANA.indexOf(k))]);
    return { ...q, c: perm.map(i => q.c[i]), a: perm.indexOf(q.a), e };
  };
  const fieldTag = f => `<span class="tag ${E.fields[f].cls}">${E.fields[f].name}</span>`;
  const stars = n => `<span class="stars" title="出題頻度">${"★".repeat(n)}${"☆".repeat(3 - n)}</span>`;
  const daysLeft = () => Math.ceil((new Date(E.target.date + "T00:00:00+09:00") - new Date()) / 86400000);
  let timerId = null;
  const stopTimer = () => { if (timerId) { clearInterval(timerId); timerId = null; } };

  function setTheme(t) {
    document.documentElement.dataset.theme = t; S.theme = t; save();
    $("#themeBtn").textContent = t === "dark" ? "☀️" : "🌙";
    document.querySelector('meta[name="theme-color"]').content = t === "dark" ? "#1d2024" : "#1f6f5c";
  }
  setTheme(S.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  $("#themeBtn").onclick = () => setTheme(S.theme === "dark" ? "light" : "dark");
  const menu = open => { $("#sidebar").classList.toggle("open", open); $("#backdrop").classList.toggle("show", open); };
  $("#menuBtn").onclick = () => menu(!$("#sidebar").classList.contains("open"));
  $("#backdrop").onclick = () => menu(false);

  // オフライン対応（GitHub Pages など https で配信したときだけ有効）
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  const d = daysLeft();
  $("#countChip").textContent = d > 0 ? `${E.target.label}まで あと${d}日` : "試験期間中／終了";

  function recordWrong(q, correct) { if (correct) delete S.wrong[q.id]; else S.wrong[q.id] = true; }
  function addHistory(type, label, score, total) {
    S.history.unshift({ at: new Date().toISOString(), type, label, score, total });
    S.history = S.history.slice(0, 50); save();
  }

  /* ---------- ルーター ---------- */
  const routes = {
    "": home, about, roadmap, units, unit, test, mock, b: kamokuB, weak, record
  };
  function router() {
    stopTimer();
    const [path, ...rest] = location.hash.replace(/^#\/?/, "").split("/");
    const fn = routes[path] || home;
    document.querySelectorAll("[data-nav]").forEach(a => {
      const n = a.dataset.nav;
      a.classList.toggle("active", n === (path || "home") || (n === "units" && (path === "unit" || path === "test")));
    });
    const tab = { unit: "units", test: "units", "": "home" }[path] ?? path;
    document.querySelectorAll("[data-tab]").forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
    menu(false);
    app.innerHTML = "";
    fn(...rest.map(decodeURIComponent));
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", router);

  /* ---------- ホーム ---------- */
  function home() {
    const doneN = Object.keys(S.done).length;
    const pct = Math.round(doneN / UNITS.length * 100);
    const avg = (() => { const v = Object.values(S.best); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; })();
    const next = UNITS.find(u => !S.done[u.id]);
    const wrongN = Object.keys(S.wrong).length;
    const days = daysLeft();
    app.innerHTML = `
      <section class="hero">
        <div>
          <h1>応用情報技術者試験 合格ノート</h1>
          <p>概要 → 単元解説 → 確認クイズ → 単元テスト → 模擬試験 の順に進めれば、科目A・科目Bの合格ラインを狙えるように構成しています。</p>
        </div>
        <div>
          <div class="big">${days > 0 ? days : 0}<small>日</small></div>
          <div class="sub">${E.target.label}（${E.target.date.replaceAll("-", "/")}）まで</div>
        </div>
      </section>

      <h2>📈 あなたの進み具合</h2>
      <div class="grid grid-4">
        <div class="card stat"><span class="num">${doneN}<small style="font-size:16px"> / ${UNITS.length}</small></span><span class="lbl">学習済み単元</span><div class="bar"><i style="width:${pct}%"></i></div></div>
        <div class="card stat"><span class="num">${avg}%</span><span class="lbl">単元テスト平均（最高点）</span></div>
        <div class="card stat"><span class="num">${wrongN}</span><span class="lbl">復習待ちの問題</span></div>
        <div class="card stat"><span class="num">${ALL_Q.length}</span><span class="lbl">収録問題数</span></div>
      </div>

      <h2>🎯 次にやること</h2>
      <div class="grid grid-3">
        ${next ? `<a class="card unit-card" href="#/unit/${next.id}"><span class="tag gray">次の単元</span><h3>${esc(next.title)}</h3><p>${esc(next.summary)}</p><div class="meta">${fieldTag(next.field)} ${stars(next.freq)}</div></a>`
               : `<a class="card unit-card" href="#/mock"><span class="tag gray">全単元完了！</span><h3>模擬試験で仕上げ</h3><p>80問・150分の本番形式で実力チェック。</p></a>`}
        <a class="card unit-card" href="#/mock"><span class="tag gray">実力チェック</span><h3>⏱️ 模擬試験（科目A）</h3><p>本番と同じ分野配分でランダム出題。20問のミニ版もあります。</p></a>
        <a class="card unit-card" href="#/b"><span class="tag b">科目B</span><h3>✍️ 記述演習</h3><p>問1セキュリティ（必須）と選択分野の解き方・記述練習。</p></a>
        ${wrongN ? `<a class="card unit-card" href="#/weak"><span class="tag gray">復習</span><h3>🔁 間違えた問題 ${wrongN}問</h3><p>正解するとリストから消えます。</p></a>` : ""}
      </div>

      <h2>📘 まず知っておくこと</h2>
      <div class="box warn"><b>重要：</b>現行の応用情報技術者試験は <b>2026年度（令和8年度）で終了</b>し、2027年度から新制度へ移行予定です。前期の申込は締め切られているため、これから受けるなら <b>令和8年度 後期（申込 2027/1/27〜2/16）</b> が現行APのラストチャンスです。<a href="#/about">詳しく見る →</a></div>
    `;
  }

  /* ---------- 試験概要 ---------- */
  function about() {
    app.innerHTML = `
      <div class="crumbs"><a href="#/">ホーム</a> / 応用情報とは</div>
      <h1>📘 応用情報技術者試験とは</h1>
      <p class="lead">情報: ${E.updated} 時点の IPA 公式発表に基づきます。日程は変わる可能性があるので申込前に公式サイトを確認してください。</p>

      <div class="card content">
        <h3>どんな試験？</h3>
        <p>IPA（情報処理推進機構）が実施する国家試験「情報処理技術者試験」のひとつで、<b>レベル3（スキルレベル：応用）</b>に位置づけられます。キャッチフレーズは「ワンランク上のITエンジニア」。基本情報技術者（レベル2）の次のステップで、<b>技術・管理・経営</b>まで幅広い知識と、それを応用する力が問われます。</p>
        <ul>
          <li><b>対象者像：</b>高度IT人材となるために必要な応用的知識・技能をもち、高度IT人材としての方向性を確立した人</li>
          <li><b>受験資格：</b>なし（誰でも受験可）</li>
          <li><b>受験手数料：</b>${E.fee}</li>
          <li><b>実施方式：</b>2026年度から <b>CBT方式</b>（テストセンターのPCで受験。画面上のメモ・電卓機能あり。受験票は送付されず、本人確認書類が必須）</li>
          <li><b>メリット：</b>高度試験・支援士試験の科目A-1（旧午前Ⅰ）が合格後2年間免除／IT系企業での評価・資格手当／SES案件のスキルシートで「基本の一段上」を示せる</li>
        </ul>
      </div>

      <h2>📅 試験日程（令和8年度）</h2>
      <div class="table-wrap"><table class="table">
        <tr><th>回</th><th>申込受付</th><th>科目A 実施期間</th><th>科目B 実施期間</th><th>合格発表</th></tr>
        ${E.schedule.map(s => `<tr><td><b>${s.term}</b><br><span class="tag ${s.note.includes("最終") ? "b" : "gray"}">${s.note}</span></td><td>${s.apply}</td><td>${s.a}</td><td>${s.b}</td><td>${s.result}</td></tr>`).join("")}
      </table></div>
      <p style="font-size:14px;color:var(--muted)">CBT方式のため、期間内の会場の予約枠から日時を選びます。申込時に科目A群と科目B群を同時に予約します。</p>

      <h2>📝 試験の構成</h2>
      <div class="table-wrap"><table class="table">
        <tr><th>科目</th><th>時間</th><th>形式</th><th>出題・解答数</th><th>合格基準</th></tr>
        ${E.format.map(f => `<tr><td><b>${f.name}</b></td><td>${f.time}</td><td>${f.type}</td><td>${f.q}</td><td>${f.pass}</td></tr>`).join("")}
      </table></div>
      <div class="box point"><b>合格条件：</b>科目A・科目Bの <b>両方</b> が60点以上で合格。科目Aが60点未満だと科目Bは採点されません。合格率は例年 <b>20%台</b>。</div>

      <h3>科目A の分野配分（目安）</h3>
      <div class="grid grid-3">
        ${Object.values(E.fields).map(f => `<div class="card stat"><span class="tag ${f.cls}" style="align-self:flex-start">${f.name}</span><span class="num">${f.aCount}問</span><span class="lbl">80問中</span></div>`).join("")}
      </div>

      <h3>科目B の出題分野（11問から5問）</h3>
      <div class="table-wrap"><table class="table">
        <tr><th>問</th><th>分野</th><th>区分</th></tr>
        ${E.bFields.map(f => `<tr><td>問${f.no}</td><td>${f.name}</td><td>${f.must ? '<span class="tag b">必須</span>' : '<span class="tag gray">4問選択</span>'}</td></tr>`).join("")}
      </table></div>

      <h2>🔄 2027年度からの変更（新制度）</h2>
      <div class="card content">
        <p>IPAは2027年度から試験制度を見直す予定で、<b>現行の応用情報技術者試験と高度試験は再編</b>され、「マネジメント」「データ・AI」「システム」の3区分からなる新試験（仮称：プロフェッショナルデジタルスキル試験／高度情報技術試験）になる案が公表されています（2027年度夏〜秋頃開始予定）。</p>
        <p>ただし、ここで学ぶ知識（セキュリティ・ネットワーク・DB・PM・ストラテジ）は新試験でもそのまま土台になります。</p>
      </div>

      <h2>出典</h2>
      <ul class="sources">${E.sources.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join("")}</ul>
    `;
  }

  /* ---------- ロードマップ ---------- */
  function roadmap() {
    app.innerHTML = `
      <div class="crumbs"><a href="#/">ホーム</a> / 学習ロードマップ</div>
      <h1>🗺️ 合格までのロードマップ</h1>
      <p class="lead">目安は合計 <b>150〜200時間</b>（基本情報合格者・実務経験者なら100時間前後）。後期試験（2月〜3月）に向けた約11週間プランです。</p>
      <div class="timeline">
        <div class="step"><div class="when">第1〜2週（11月下旬〜12月上旬）</div><h3>全体像をつかむ＋テクノロジ系の基礎</h3><p>基礎理論・アルゴリズム・コンピュータ構成要素。計算問題（基数変換・稼働率・MIPS）は手を動かして確実に。</p></div>
        <div class="step"><div class="when">第3〜4週（12月中旬〜下旬）</div><h3>ネットワーク・データベース・セキュリティ</h3><p>科目Bでも主力になる3分野。<b>セキュリティは科目Bで必須</b>なので最優先。</p></div>
        <div class="step"><div class="when">第5週（1月上旬）</div><h3>開発技術・マネジメント系</h3><p>システム開発／PM（EVM・アローダイアグラム）／サービスマネジメント／監査。</p></div>
        <div class="step"><div class="when">第6週（1月中旬）</div><h3>ストラテジ系 ＋ 申込（1/27〜）</h3><p>経営戦略・会計（損益分岐点）・法務。<b>1/27から申込開始。会場予約は早めに。</b></p></div>
        <div class="step"><div class="when">第7〜8週（1月下旬〜2月上旬）</div><h3>科目A 仕上げ</h3><p>模擬試験80問で <b>70%以上</b> を安定させる。間違えた問題リストを0に。</p></div>
        <div class="step"><div class="when">2/6〜2/19</div><h3>科目A 受験</h3><p>予約した日に受験。</p></div>
        <div class="step"><div class="when">第9〜11週（2月中旬〜3月上旬）</div><h3>科目B 集中対策</h3><p>選択する4分野を決めて記述演習。IPA公開の過去問（午後）で時間を計って解く。</p></div>
        <div class="step"><div class="when">3/3〜3/15</div><h3>科目B 受験</h3><p>合格発表は2027年6月頃。</p></div>
      </div>

      <h2>🧭 科目Bの選択分野おすすめ</h2>
      <div class="card content">
        <table>
          <tr><th>タイプ</th><th>おすすめ4分野</th><th>理由</th></tr>
          <tr><td>開発・SE経験あり（Java等）</td><td>プログラミング／データベース／情報システム開発／プロジェクトマネジメント</td><td>実務知識が直結。アルゴリズムは得点が安定しやすい</td></tr>
          <tr><td>管理・PMO・テスト系</td><td>プロジェクトマネジメント／サービスマネジメント／システム監査／経営戦略</td><td>文章読解中心で計算が少なめ。本文にヒントが多い</td></tr>
          <tr><td>インフラ寄り</td><td>ネットワーク／システムアーキテクチャ／データベース／サービスマネジメント</td><td>用語知識があれば短時間で解ける</td></tr>
        </table>
        <p>本番では<b>5〜6分野を準備</b>しておき、当日の問題を見て解きやすいものを選ぶのが定石です。</p>
      </div>

      <h2>💡 勉強のコツ</h2>
      <div class="grid grid-2">
        <div class="card"><h3 style="margin-top:0">科目A</h3><ul><li>過去問からの再出題が多い → 問題演習が最重要</li><li>解説を読んで「なぜ他の選択肢が違うか」まで説明できるように</li><li>計算問題は捨てない（パターンが決まっている）</li></ul></div>
        <div class="card"><h3 style="margin-top:0">科目B</h3><ul><li>答えは本文中にあることが多い（特にマネジメント系）</li><li>記述は「〜のため」「〜すること」と設問の聞き方に合わせる</li><li>字数制限の8割以上は書く</li></ul></div>
      </div>
    `;
  }

  /* ---------- 単元一覧 ---------- */
  function units(filter = "all") {
    const list = UNITS.filter(u => filter === "all" || u.field === filter);
    app.innerHTML = `
      <div class="crumbs"><a href="#/">ホーム</a> / 単元一覧</div>
      <h1>📚 単元一覧</h1>
      <p class="lead">IPAシラバスの分類に沿った全${UNITS.length}単元。★は科目Aでの出題頻度の目安です。</p>
      <div class="filters">
        ${[["all", "すべて"], ["tech", "テクノロジ系"], ["mgmt", "マネジメント系"], ["strat", "ストラテジ系"]].map(([k, l]) => `<button class="${filter === k ? "active" : ""}" onclick="location.hash='#/units/${k}'">${l}</button>`).join("")}
      </div>
      <div class="grid grid-3">
        ${list.map(u => `
          <a class="card unit-card" href="#/unit/${u.id}">
            ${S.done[u.id] ? '<span class="done">✓ 学習済み</span>' : ""}
            <h3>${esc(u.title)}</h3>
            <p>${esc(u.summary)}</p>
            <div class="meta">${fieldTag(u.field)} ${stars(u.freq)} <span class="tag gray">${u.quiz.length}問</span>
              ${S.best[u.id] != null ? `<span class="tag gray">最高 ${S.best[u.id]}%</span>` : ""}</div>
          </a>`).join("")}
      </div>`;
  }

  /* ---------- 単元ページ ---------- */
  function unit(id, tab = "learn") {
    const u = unitById[id];
    if (!u) return units();
    const idx = UNITS.indexOf(u);
    const prev = UNITS[idx - 1], next = UNITS[idx + 1];
    app.innerHTML = `
      <div class="crumbs"><a href="#/">ホーム</a> / <a href="#/units">単元一覧</a> / ${esc(u.cat)}</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${fieldTag(u.field)} ${stars(u.freq)} <span class="tag gray">${esc(u.cat)}</span></div>
      <h1 style="margin-top:8px">${esc(u.title)}</h1>
      <p class="lead">${esc(u.summary)}</p>
      <div class="tabs">
        <button data-t="learn">📖 解説</button>
        <button data-t="terms">🔑 用語まとめ</button>
        <button data-t="quiz">✅ 確認クイズ</button>
      </div>
      <div id="pane"></div>
      <div class="btn-row" style="justify-content:space-between;margin-top:36px;border-top:1px solid var(--line);padding-top:18px">
        ${prev ? `<a class="btn" href="#/unit/${prev.id}">← ${esc(prev.title)}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#/unit/${next.id}">${esc(next.title)} →</a>` : ""}
      </div>`;
    const pane = $("#pane");
    const show = t => {
      app.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.t === t));
      if (t === "learn") {
        pane.innerHTML = `<div class="content">${u.sections.map(s => `<h3>${s.h}</h3>${s.body}`).join("")}</div>
          ${u.tips?.length ? `<div class="box point"><b class="lbl">🎯 試験に出るポイント</b><ul style="margin:0">${u.tips.map(t => `<li>${t}</li>`).join("")}</ul></div>` : ""}
          <div class="btn-row">
            <button class="btn ${S.done[u.id] ? "" : "primary"}" id="doneBtn">${S.done[u.id] ? "✓ 学習済み（取り消す）" : "学習済みにする"}</button>
            <a class="btn" href="#/test/${u.id}">📝 単元テストに挑戦（${u.quiz.length}問）</a>
          </div>`;
        $("#doneBtn").onclick = () => { if (S.done[u.id]) delete S.done[u.id]; else S.done[u.id] = true; save(); show("learn"); };
      } else if (t === "terms") {
        pane.innerHTML = `<div class="table-wrap"><table class="table"><tr><th style="width:30%">用語</th><th>意味・覚え方</th></tr>
          ${u.terms.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join("")}</table></div>`;
      } else {
        const qs = shuffle(u.quiz).slice(0, Math.min(5, u.quiz.length));
        practice(pane, qs, { title: "確認クイズ（ランダム5問）", onDone: (sc, tot) => addHistory("クイズ", u.title, sc, tot), retry: () => show("quiz") });
      }
    };
    app.querySelectorAll(".tabs button").forEach(b => b.onclick = () => show(b.dataset.t));
    show(tab);
  }

  /* ---------- 単元テスト ---------- */
  function test(id) {
    const u = unitById[id];
    if (!u) return units();
    app.innerHTML = `<div class="crumbs"><a href="#/">ホーム</a> / <a href="#/units">単元一覧</a> / <a href="#/unit/${u.id}">${esc(u.title)}</a> / 単元テスト</div>
      <h1>📝 単元テスト：${esc(u.title)}</h1><p class="lead">全${u.quiz.length}問。1問ずつ答え合わせ＆解説が出ます。80%以上で合格ラインです。</p><div id="pane"></div>`;
    practice($("#pane"), shuffle(u.quiz), {
      title: "単元テスト",
      onDone: (sc, tot) => {
        const p = Math.round(sc / tot * 100);
        S.best[u.id] = Math.max(S.best[u.id] || 0, p);
        if (p >= 80) S.done[u.id] = true;
        addHistory("単元テスト", u.title, sc, tot);
      },
      retry: () => test(id),
      passLine: 80
    });
  }

  /* ---------- 練習モード（1問ずつ即採点） ---------- */
  function practice(root, qsIn, opt) {
    const qs = qsIn.map(view);
    let i = 0, score = 0;
    const log = [];
    const render = () => {
      if (i >= qs.length) return finish();
      const q = qs[i];
      const u = unitById[q.unit];
      root.innerHTML = `<div class="quiz">
        <div class="progress"><i style="width:${i / qs.length * 100}%"></i></div>
        <div class="q-head"><span>${opt.title}　<b>第${i + 1}問</b> / ${qs.length}</span><span>${fieldTag(q.field)} <span class="tag gray">${esc(u.cat)}</span></span></div>
        <div class="q-text">${q.q}</div>
        <div class="choices">${q.c.map((c, k) => `<button class="choice" data-k="${k}"><span class="k">${KANA[k]}</span><span>${c}</span></button>`).join("")}</div>
        <div id="ex"></div></div>`;
      root.querySelectorAll(".choice").forEach(btn => btn.onclick = () => {
        const k = +btn.dataset.k, ok = k === q.a;
        if (ok) score++;
        log.push({ q, pick: k, ok });
        recordWrong(q, ok); save();
        root.querySelectorAll(".choice").forEach(b => { b.disabled = true; const bk = +b.dataset.k; if (bk === q.a) b.classList.add("correct"); else if (bk === k) b.classList.add("wrong"); });
        $("#ex", root).innerHTML = `<div class="explain"><div class="verdict ${ok ? "ok" : "ng"}">${ok ? "⭕ 正解！" : `❌ 不正解（正解：${KANA[q.a]}）`}</div>${q.e}</div>
          <div class="btn-row"><button class="btn primary" id="nx">${i + 1 < qs.length ? "次の問題へ →" : "結果を見る"}</button></div>`;
        $("#nx", root).onclick = () => { i++; render(); };
        $("#nx", root).focus();
      });
    };
    const finish = () => {
      const p = Math.round(score / qs.length * 100), line = opt.passLine || 60;
      opt.onDone && opt.onDone(score, qs.length);
      root.innerHTML = `<div class="card" style="text-align:center">
          <div>${opt.title} 結果</div>
          <div class="result-score ${p >= line ? "pass" : "fail"}">${p}<small>%</small></div>
          <div>${score} / ${qs.length} 問正解　${p >= line ? "🎉 合格ライン突破！" : `合格ライン ${line}% まであと少し`}</div>
          <div class="btn-row" style="justify-content:center"><button class="btn primary" id="rt">もう一度</button><a class="btn" href="#/weak">間違えた問題を復習</a></div>
        </div>
        <h2>ふりかえり</h2>${reviewList(log)}`;
      $("#rt", root).onclick = opt.retry;
    };
    render();
  }

  const reviewList = log => log.map((l, n) => `<div class="review-item ${l.ok ? "ok" : "ng"}">
      <div class="q">${n + 1}. ${l.ok ? "⭕" : "❌"} ${l.q.q}</div>
      <div class="a">あなたの解答：${l.pick == null ? "未解答" : KANA[l.pick] + "　" + l.q.c[l.pick]}　／　正解：${KANA[l.q.a]}　${l.q.c[l.q.a]}</div>
      ${l.ok ? "" : `<div class="a" style="margin-top:4px">💡 ${l.q.e}</div>`}</div>`).join("");

  /* ---------- 模擬試験 ---------- */
  function mock(n) {
    if (!n) {
      app.innerHTML = `<div class="crumbs"><a href="#/">ホーム</a> / 模擬試験</div>
        <h1>⏱️ 模擬試験（科目A形式）</h1>
        <p class="lead">本番と同じ分野配分（テクノロジ:マネジメント:ストラテジ ＝ 50:10:20）でランダム出題します。全問解答後にまとめて採点します。</p>
        <div class="grid grid-3">
          <div class="card"><h3 style="margin-top:0">ミニ模試</h3><p>20問 / 37分<br>スキマ時間の実力チェックに</p><a class="btn primary" href="#/mock/20">開始する</a></div>
          <div class="card"><h3 style="margin-top:0">ハーフ模試</h3><p>40問 / 75分<br>週1回の定点観測に</p><a class="btn primary" href="#/mock/40">開始する</a></div>
          <div class="card"><h3 style="margin-top:0">本番形式</h3><p>80問 / 150分<br>直前期の総仕上げに</p><a class="btn primary" href="#/mock/80">開始する</a></div>
        </div>
        <div class="box point">本番の目安：1問あたり約1分50秒。<b>60%で合格、70%以上で安全圏</b>です。</div>`;
      return;
    }
    n = +n;
    const pick = (f, cnt) => shuffle(ALL_Q.filter(q => q.field === f)).slice(0, cnt);
    const nt = Math.round(n * 50 / 80), nm = Math.round(n * 10 / 80), ns = n - nt - nm;
    const qs = [...pick("tech", nt), ...pick("mgmt", nm), ...pick("strat", ns)].map(view);
    const ans = new Array(qs.length).fill(null);
    let cur = 0, remain = Math.round(n * 150 / 80 * 60);
    app.innerHTML = `<div class="crumbs"><a href="#/mock">模擬試験</a> / ${n}問</div><div id="pane"></div>`;
    const pane = $("#pane");
    const tick = () => {
      remain--;
      const t = $("#tm");
      if (t) { t.textContent = fmt(remain); t.classList.toggle("low", remain < 300); }
      if (remain <= 0) submit();
    };
    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    timerId = setInterval(tick, 1000);
    const render = () => {
      const q = qs[cur];
      pane.innerHTML = `<div class="quiz">
        <div class="q-head"><span><b>第${cur + 1}問</b> / ${qs.length}　${fieldTag(q.field)}</span><span>残り <span class="timer" id="tm">${fmt(remain)}</span></span></div>
        <div class="q-text">${q.q}</div>
        <div class="choices">${q.c.map((c, k) => `<button class="choice ${ans[cur] === k ? "selected" : ""}" data-k="${k}"><span class="k">${KANA[k]}</span><span>${c}</span></button>`).join("")}</div>
        <div class="btn-row"><button class="btn" id="pv" ${cur === 0 ? "disabled" : ""}>← 前へ</button><button class="btn" id="nx" ${cur === qs.length - 1 ? "disabled" : ""}>次へ →</button>
          <button class="btn primary" id="sb" style="margin-left:auto">採点する（${ans.filter(a => a != null).length}/${qs.length}）</button></div>
        <div class="qnav">${qs.map((_, k) => `<button class="${ans[k] != null ? "answered" : ""} ${k === cur ? "cur" : ""}" data-j="${k}">${k + 1}</button>`).join("")}</div></div>`;
      pane.querySelectorAll(".choice").forEach(b => b.onclick = () => { ans[cur] = +b.dataset.k; if (cur < qs.length - 1) cur++; render(); });
      $("#pv").onclick = () => { cur--; render(); };
      $("#nx").onclick = () => { cur++; render(); };
      $("#sb").onclick = () => { const un = ans.filter(a => a == null).length; if (!un || confirm(`未解答が${un}問あります。採点しますか？`)) submit(); };
      pane.querySelectorAll(".qnav button").forEach(b => b.onclick = () => { cur = +b.dataset.j; render(); });
    };
    const submit = () => {
      stopTimer();
      const log = qs.map((q, k) => ({ q, pick: ans[k], ok: ans[k] === q.a }));
      log.forEach(l => recordWrong(l.q, l.ok));
      const sc = log.filter(l => l.ok).length, p = Math.round(sc / qs.length * 100);
      addHistory("模擬試験", `${n}問`, sc, qs.length);
      const by = f => { const a = log.filter(l => l.q.field === f); return a.length ? Math.round(a.filter(l => l.ok).length / a.length * 100) : 0; };
      const unitRate = {};
      log.forEach(l => { const r = unitRate[l.q.unit] ||= { ok: 0, n: 0 }; r.n++; if (l.ok) r.ok++; });
      const weakUnits = Object.entries(unitRate).filter(([, r]) => r.ok / r.n < 0.6).map(([id]) => unitById[id]);
      pane.innerHTML = `<div class="card" style="text-align:center">
          <div>模擬試験（${n}問）結果</div>
          <div class="result-score ${p >= 60 ? "pass" : "fail"}">${p}<small>点</small></div>
          <div>${sc} / ${qs.length} 問正解　${p >= 70 ? "🎉 安全圏です！" : p >= 60 ? "✅ 合格ライン到達（70%を目指そう）" : "📚 合格ライン60点まで復習しよう"}</div>
          <div class="grid grid-3" style="margin-top:18px;text-align:left">
            ${["tech", "mgmt", "strat"].map(f => `<div class="card stat">${fieldTag(f)}<span class="num">${by(f)}%</span><div class="bar"><i style="width:${by(f)}%"></i></div></div>`).join("")}
          </div>
          <div class="btn-row" style="justify-content:center"><a class="btn primary" href="#/mock">別の模試へ</a><a class="btn" href="#/weak">間違えた問題を復習</a></div>
        </div>
        ${weakUnits.length ? `<h2>📌 優先して復習したい単元</h2><div class="filters">${weakUnits.map(u => `<a class="btn small" href="#/unit/${u.id}">${esc(u.title)}</a>`).join("")}</div>` : ""}
        <h2>ふりかえり</h2>${reviewList(log)}`;
      window.scrollTo(0, 0);
    };
    render();
  }

  /* ---------- 科目B ---------- */
  function kamokuB(id) {
    if (!id) {
      app.innerHTML = `<div class="crumbs"><a href="#/">ホーム</a> / 科目B対策</div>
        <h1>✍️ 科目B（旧 午後）対策</h1>
        <p class="lead">150分で5問（問1 情報セキュリティ必須＋問2〜11から4問）。1問あたり30分が目安です。各分野の「解き方」と、オリジナル事例での記述練習があります。</p>
        <div class="box point"><b class="lbl">科目B 共通の解き方</b><ol style="margin:0">
          <li><b>設問を先に読む</b>：何を聞かれているかを把握してから本文へ</li>
          <li><b>本文に線を引く感覚で</b>：答えの根拠は本文中にあることが多い</li>
          <li><b>聞かれ方に合わせて答える</b>：「理由」→「〜のため」、「目的」→「〜するため」、「何を」→ 名詞で</li>
          <li><b>字数は8〜10割</b>：短すぎると要素不足で減点されやすい</li>
          <li><b>空欄は残さない</b>：部分点がある前提で必ず書く</li>
        </ol></div>
        <div class="grid grid-2">
          ${B.map(c => `<a class="card unit-card" href="#/b/${c.id}"><div class="meta"><span class="tag b">問${c.no}</span>${c.must ? '<span class="tag b">必須</span>' : ""}</div><h3>${esc(c.field)}</h3><p>${esc(c.desc)}</p></a>`).join("")}
        </div>`;
      return;
    }
    const c = B.find(x => x.id === id);
    if (!c) return kamokuB();
    app.innerHTML = `<div class="crumbs"><a href="#/">ホーム</a> / <a href="#/b">科目B対策</a> / ${esc(c.field)}</div>
      <div class="meta"><span class="tag b">問${c.no}</span> ${c.must ? '<span class="tag b">必須</span>' : '<span class="tag gray">選択</span>'}</div>
      <h1 style="margin-top:8px">${esc(c.field)}</h1>
      <p class="lead">${esc(c.desc)}</p>
      <h2>🧠 この分野の解き方</h2>
      <div class="card content">${c.howto}</div>
      <h2>✍️ 記述演習：${esc(c.case.title)}</h2>
      <div class="case">${c.case.text}</div>
      ${c.case.qs.map((q, k) => `<div class="subq"><div class="sq">設問${k + 1}　${q.q}</div>
        <textarea placeholder="ここに解答を書いてみよう（${q.limit || "字数自由"}）" data-k="${k}"></textarea>
        <div class="btn-row" style="margin-top:6px"><button class="btn small" data-show="${k}">解答例を見る</button></div>
        <div class="model box point" id="m${k}"><b class="lbl">解答例</b>${q.a}${q.point ? `<div style="margin-top:6px;font-size:14px">📝 採点のポイント：${q.point}</div>` : ""}</div></div>`).join("")}
      <div class="box warn">本番レベルの問題演習には、IPAが公開している過去問題（午後試験）を使うのが最も効果的です：<a href="https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html" target="_blank" rel="noopener">IPA 過去問題</a></div>`;
    const kk = "b-" + c.id;
    const saved = JSON.parse(localStorage.getItem(kk) || "{}");
    app.querySelectorAll("textarea").forEach(t => { t.value = saved[t.dataset.k] || ""; t.oninput = () => { saved[t.dataset.k] = t.value; localStorage.setItem(kk, JSON.stringify(saved)); }; });
    app.querySelectorAll("[data-show]").forEach(b => b.onclick = () => { const m = $("#m" + b.dataset.show); m.classList.toggle("show"); b.textContent = m.classList.contains("show") ? "解答例を隠す" : "解答例を見る"; });
  }

  /* ---------- 間違えた問題 ---------- */
  function weak() {
    const qs = ALL_Q.filter(q => S.wrong[q.id]);
    app.innerHTML = `<div class="crumbs"><a href="#/">ホーム</a> / 間違えた問題</div>
      <h1>🔁 間違えた問題の復習</h1><p class="lead">クイズ・テスト・模試で間違えた問題がたまります。正解するとリストから外れます。</p><div id="pane"></div>`;
    const pane = $("#pane");
    if (!qs.length) { pane.innerHTML = `<div class="card empty">🎉 復習待ちの問題はありません。<br><a href="#/units">単元一覧へ</a></div>`; return; }
    const byUnit = {};
    qs.forEach(q => (byUnit[q.unit] ||= []).push(q));
    pane.innerHTML = `<div class="card"><b>${qs.length}問</b> が復習待ちです。
        <div class="filters" style="margin-top:10px">${Object.entries(byUnit).map(([u, a]) => `<span class="tag gray">${esc(unitById[u].title)}：${a.length}</span>`).join("")}</div>
        <button class="btn primary" id="go">まとめて解き直す</button></div>`;
    $("#go").onclick = () => practice(pane, shuffle(qs), { title: "復習", onDone: (s, t) => addHistory("復習", "間違えた問題", s, t), retry: weak });
  }

  /* ---------- 学習記録 ---------- */
  function record() {
    app.innerHTML = `<div class="crumbs"><a href="#/">ホーム</a> / 学習記録</div>
      <h1>📊 学習記録</h1><p class="lead">記録はこのブラウザ内（localStorage）に保存されます。</p>
      ${["tech", "mgmt", "strat"].map(f => `<h2>${fieldTag(f)}</h2><div class="table-wrap"><table class="table"><tr><th>単元</th><th style="width:110px">状態</th><th style="width:150px">単元テスト最高</th></tr>
        ${UNITS.filter(u => u.field === f).map(u => `<tr><td><a href="#/unit/${u.id}">${esc(u.title)}</a></td><td>${S.done[u.id] ? "✅ 学習済み" : "—"}</td><td>${S.best[u.id] != null ? `<div class="bar"><i style="width:${S.best[u.id]}%"></i></div>${S.best[u.id]}%` : "未受験"}</td></tr>`).join("")}
      </table></div>`).join("")}
      <h2>🕒 最近の履歴</h2>
      ${S.history.length ? `<div class="table-wrap"><table class="table"><tr><th>日時</th><th>種類</th><th>内容</th><th>結果</th></tr>
        ${S.history.slice(0, 20).map(h => `<tr><td>${new Date(h.at).toLocaleString("ja-JP")}</td><td>${h.type}</td><td>${esc(h.label)}</td><td>${h.score}/${h.total}（${Math.round(h.score / h.total * 100)}%）</td></tr>`).join("")}</table></div>` : `<div class="card empty">まだ履歴がありません</div>`}
      <div class="btn-row"><button class="btn" id="rs">記録をリセット</button></div>`;
    $("#rs").onclick = () => { if (confirm("学習記録をすべて削除しますか？")) { S = { done: {}, best: {}, wrong: {}, history: [], theme: S.theme }; save(); record(); } };
  }

  router();
})();
