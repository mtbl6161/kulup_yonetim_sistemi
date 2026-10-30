// Yönetim konsolu kabuğunun (yk-*) stilleri; denetim paneli de aynı kabuğu kullanır.
export const KABUK_STIL = `
.yk { display: flex; min-height: 100vh; background: var(--bg); color: var(--text); font-family: var(--font-sans); }
.yk-menu { width: 244px; flex-shrink: 0; background: #0e1116; color: #c9ced6; display: flex; flex-direction: column; padding: 16px 12px; box-sizing: border-box; gap: 14px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.yk-marka { display: flex; align-items: center; gap: 10px; padding: 4px 6px 8px; }
.yk-marka strong { display: block; font-family: var(--font-display); font-size: 16px; color: #fff; letter-spacing: -0.01em; }
.yk-marka span { display: block; font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #8b93a1; }
.yk-kapat { display: none; margin-left: auto; background: none; border: 0; color: #c9ced6; cursor: pointer; }
.yk-grup { font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #8b93a1; padding: 12px 10px 4px; }
.yk-oge { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 0; border-radius: 8px; background: transparent; color: #c9ced6; font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer; text-align: left; }
.yk-oge:hover { background: #161b25; color: #fff; }
.yk-oge.on { background: #1c2230; color: #fff; font-weight: 600; box-shadow: inset 3px 0 0 #6d8bff; }
.yk-oge:focus-visible, .yk-kisi button:focus-visible { outline: 2px solid #6d8bff; outline-offset: 1px; }
.yk-oge em { margin-left: auto; font-style: normal; font-family: var(--font-mono); font-size: 11px; color: #8b93a1; }
.yk-oge em.vurgu { background: #f0b43c; color: #1d1404; font-family: var(--font-sans); font-weight: 700; border-radius: 10px; padding: 1px 7px; }
.yk-kisi { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 10px 6px 2px; border-top: 1px solid #222937; }
.yk-kisi strong { display: block; font-size: 12.5px; color: #fff; }
.yk-kisi span { display: block; font-size: 11px; color: #8b93a1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.yk-kisi button { background: none; border: 0; color: #8b93a1; cursor: pointer; padding: 6px; border-radius: 6px; }
.yk-kisi button:hover { color: #fff; background: #1c2230; }
.yk-avatar { width: 30px; height: 30px; border-radius: 50%; background: #2a3242; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.yk-ana { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.yk-ust { display: flex; align-items: center; gap: 12px; padding: 16px 28px; background: var(--surface); border-bottom: 1px solid var(--border); flex-wrap: wrap; position: sticky; top: 0; z-index: 20; }
.yk-ust h1 { margin: 0; font-family: var(--font-display); font-size: 21px; font-weight: 700; letter-spacing: -0.02em; }
.yk-ust p { margin: 2px 0 0; font-size: 13px; color: var(--text3); }
.yk-ust-eylem { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.yk-menu-ac { display: none; width: 38px; height: 38px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); align-items: center; justify-content: center; cursor: pointer; }
.yk-icerik { padding: 22px 28px 40px; display: flex; flex-direction: column; gap: 18px; width: 100%; max-width: 1320px; box-sizing: border-box; }
.yk-kart { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; min-width: 0; }
.yk-kart-bas { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 18px 12px; flex-wrap: wrap; }
.yk-kart-bas h2 { margin: 0; font-size: 15px; font-weight: 700; }
.yk-kart-sag { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.yk-tablo { overflow-x: auto; }
.yk-tablo .data-table th { white-space: nowrap; }
.yk-tablo tr.secili td { background: var(--accent-lighter); }
.yk-tablo tr.secili td:first-child { box-shadow: inset 3px 0 0 var(--accent); }
.yk-tablo tr.tikla { cursor: pointer; }
.yk-sayfalama { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-top: 1px solid var(--border); font-size: 12.5px; color: var(--text3); }
.yk-segment { display: flex; gap: 3px; padding: 3px; background: #eceef2; border-radius: 9px; flex-wrap: wrap; }
.yk-segment button { height: 30px; padding: 0 11px; border: 1px solid transparent; border-radius: 7px; background: transparent; font: inherit; font-size: 12.5px; font-weight: 500; color: var(--text2); cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.yk-segment button.on { background: var(--surface); border-color: var(--border); color: var(--text); font-weight: 600; }
.yk-segment button span { color: var(--text3); font-weight: 500; font-variant-numeric: tabular-nums; }
.yk-kpi { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.yk-kpi > div { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 15px 17px; }
.yk-kpi .ad { font-size: 12px; font-weight: 600; color: var(--text3); }
.yk-kpi .deger { font-family: var(--font-display); font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin-top: 5px; font-variant-numeric: tabular-nums; }
.yk-kpi .alt { font-size: 12px; color: var(--text3); margin-top: 3px; }
.yk-iki { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start; }
.yk-iki > .genis { flex: 999 1 540px; min-width: 0; display: flex; flex-direction: column; gap: 18px; }
.yk-iki > .dar { flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 18px; }
.yk-arac { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.yk-ara { display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface); flex: 1 1 240px; max-width: 340px; box-sizing: border-box; }
.yk-ara:focus-within { border-color: var(--accent); box-shadow: var(--ring); }
.yk-ara input { border: 0; outline: 0; font: inherit; font-size: 13px; width: 100%; background: transparent; color: var(--text); }
.yk-satir-link { display: flex; gap: 12px; align-items: center; padding: 12px 18px; border-top: 1px solid var(--border-light); width: 100%; background: none; border-left: 0; border-right: 0; border-bottom: 0; font: inherit; text-align: left; color: var(--text); cursor: pointer; }
.yk-satir-link:hover { background: #f8f9fc; }
.yk-ikon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.yk-detay { flex: 1 1 360px; max-width: 420px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; align-self: flex-start; position: sticky; top: 92px; max-height: calc(100vh - 110px); overflow-y: auto; }
.yk-detay-bolum { padding: 16px 18px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px; }
.yk-detay-bolum h3 { margin: 0; font-size: 13.5px; font-weight: 700; }
.yk-istat { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--border); }
.yk-istat > div { padding: 11px 14px; border-right: 1px solid var(--border-light); }
.yk-istat > div:last-child { border-right: 0; }
.yk-istat span { display: block; font-size: 11px; color: var(--text3); }
.yk-istat strong { font-size: 16px; font-variant-numeric: tabular-nums; }
.yk-tatil-form { display: grid; grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr)) auto; gap: 10px; align-items: end; }
.yk-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.yk-perde { display: none; }
@media (max-width: 1100px) { .yk-kpi { grid-template-columns: repeat(2, minmax(0, 1fr)); } .yk-detay { position: static; max-width: none; max-height: none; } }
@media (max-width: 900px) {
  .yk-menu { position: fixed; left: 0; top: 0; z-index: 300; width: 280px; transform: translateX(-100%); transition: transform .25s; }
  .yk-menu.acik { transform: none; box-shadow: 0 12px 40px rgba(14,17,22,.3); }
  .yk-perde { display: block; position: fixed; inset: 0; z-index: 250; background: rgba(14,17,22,.4); }
  .yk-kapat, .yk-menu-ac { display: inline-flex; }
  .yk-ust { padding: 12px 16px; }
  .yk-icerik { padding: 16px; }
}
@media (max-width: 760px) { .yk-tatil-form { grid-template-columns: repeat(2, minmax(0, 1fr)); } .yk-tatil-form > :first-child { grid-column: 1 / -1; } }
@media (max-width: 560px) { .yk-kpi, .yk-grid2, .yk-istat { grid-template-columns: minmax(0, 1fr); } .yk-istat > div { border-right: 0; border-bottom: 1px solid var(--border-light); } }
`
