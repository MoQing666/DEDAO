/* 生成「全 BUFF/DEBUFF 战斗状态图标」预览页 _preview/battle_buffs.html
   —— 徽章内容由真实引擎 Engine.battleFxList() 现算，样式引用真实 css/style.css，
      战斗 DOM 直接从 index.html 的 #battle 层抓取，保证预览 = 实装。 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

/* ---------- 1. 沙箱加载引擎，取全状态徽章 ---------- */
function store() {
  const m = new Map();
  return { getItem: k => (m.has(String(k)) ? m.get(String(k)) : null), setItem: (k, v) => m.set(String(k), String(v)), removeItem: k => m.delete(String(k)), clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } };
}
const sb = { console, localStorage: store(), JSON, Date, Object, Array, String, Number, Boolean, Error, TypeError, RangeError, RegExp, Map, Set, WeakMap, WeakSet, Promise, Symbol, Proxy, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, Math };
sb.window = sb; sb.self = sb; sb.globalThis = sb;
sb.navigator = { userAgent: 'node', language: 'zh-CN' };
sb.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({}), addEventListener: () => {}, body: {}, head: {}, documentElement: {} };
sb.alert = () => {}; sb.confirm = () => true; sb.prompt = () => '';
const ctx = vm.createContext(sb);
vm.runInContext(
  fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8') + '\n;globalThis.__G={Engine:Engine};',
  ctx, { filename: 'combined.js' });
const E = sb.__G.Engine;

const s = E.startLife('预览');
E.commitStart(s, 'wuxing');
const b = E.combatStart(s, { name: '', atk: 0, hp: 100000 });
s.battle = b;
/* 一次性点亮全部 15 项（我方 9 / 敌方 6） */
b.fxAtkUp = { amt: 12, turns: 3 };
b.fxDefUp = { amt: 40, turns: 2 };
b.fxCritUp = { amt: 8, turns: 2 };
b.disasterStacks = 3; b.disasterTurns = 3;
b.guarded = true;
b.pStunNext = true; b.pStunKind = 'freeze';
b.pDotBurn = 2; b.pDotPoison = 1;
b.suppressed = true;
b.stunNext = true; b.stunKind = 'freeze';
b.dotBurn = 4; b.dotPoison = 2;
b.fxAtkDown = { amt: 30, turns: 2 };
b.fxBossDefUp = { amt: 25, turns: 2 };
b.enraged = true;
const fx = E.battleFxList(s, b);
const badges = (arr) => arr.map((x) =>
  '<span class="buff' + (x.bad ? ' bad' : '') + '" title="' + x.tip + '">' +
  '<i class="bf-ic">' + x.icon + '</i><b class="bf-tx">' + x.label + '</b></span>').join('');

/* ---------- 2. 从 index.html 抓真实战斗层 DOM ---------- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
/* ⚠ 必须把战斗层的收尾 `</div>` 一并吃进捕获组（非贪婪匹配到第一个「2 空格缩进的 </div>」，
   即 .chapter-overlay 自己的闭合标签）。否则外层 #preview-wrap 会被这个缺失的闭合标签吃掉，
   图例 DOM 落进手机层内部、被 z-index:9999 的不透明遮罩盖住而「看不见」。 */
const m = html.match(/<!-- =+ 战斗层（回合制） =+ -->\s*(<div class="chapter-overlay" id="battle"[\s\S]*?\n  <\/div>\n)/);
if (!m) { console.error('未能从 index.html 抓取战斗层 DOM'); process.exit(1); }
const battleSrc = m[1];
const openTag = battleSrc.match(/<div class="chapter-overlay" id="battle"[^>]*>/)[0];
if ((battleSrc.match(/\n  <\/div>\n/g) || []).length !== 1) {
  console.error('战斗层闭合标签不唯一，抓取范围可疑'); process.exit(1);
}
let battleHtml = battleSrc.replace(openTag, openTag.replace('style="display:none"', 'style="display:flex"'));
battleHtml = battleHtml.replace('<div class="buffs" id="b-me-buffs"></div>', '<div class="buffs" id="b-me-buffs">' + badges(fx.me) + '</div>');
battleHtml = battleHtml.replace('<div class="buffs" id="b-enemy-buffs"></div>', '<div class="buffs" id="b-enemy-buffs">' + badges(fx.foe) + '</div>');

/* ---------- 3. 组装预览页 ---------- */
const page = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>全 BUFF / DEBUFF 战斗状态图标 · 预览</title>
<base href="../">
<link rel="stylesheet" href="css/style.css">
<style>
  /* 预览壳：无头 Edge 的 CSS 视口有 ~504px 下限，故不靠窗口宽度，
     而是把战斗层**绝对定位**钉在 390px 宽的容器里，右侧放图例说明。 */
  html, body { margin: 0; background: #0e0c14; }
  body { display: flex; flex-direction: column; align-items: flex-start; }
  #preview-wrap { position: relative; width: 390px; height: 844px; overflow: hidden; flex: none; }
  #battle.chapter-overlay { position: absolute !important; inset: 0 !important; padding: 12px 10px; }
  /* 预览页没有 JS 层：浮字层隐藏，按钮保持静态 */
  #battle .fx-layer { display: none; }
  #preview-cap { color: #cbc0e6; font: 12px/1.85 monospace; padding: 16px 16px 34px; width: 470px; }
  #preview-cap b { color: #ffd27a; font-weight: 400; }
  #preview-cap .k { color: #ff8a7a; }
</style></head>
<body>
<div id="preview-wrap">
${battleHtml}
</div>
<div id="preview-cap">
  <div style="color:#e8c15a;font-size:14px;letter-spacing:1px;margin-bottom:6px">战斗状态图标 · 全 BUFF 演示</div>
  <b>我方（9 项）</b><br>
  ⚔️ 攻击提升　🛡️ 受伤减免　🎯 暴击提升<br>
  ✨ 伐灾　🧱 防御姿态<br>
  <span class="k">❄️ 冻结 · 🔥 灼烧 · ☠️ 中毒 · 😵 心神失守</span><br><br>
  <b>敌方（6 项）</b><br>
  <span class="k">❄️ 冻结 · 🔥 灼烧 · ☠️ 中毒 · 🔻 攻击削弱</span><br>
  🪨 减伤　💢 狂暴<br><br>
  <span style="color:#8b7fae">徽章内容由 Engine.battleFxList() 现算，<br>
  样式取自 css/style.css；悬停可看完整说明。</span>
</div>
<script>
  /* 填上示例数值，让血条/名字看起来是实战状态 */
  document.getElementById('b-me-num').textContent = '812 / 1200';
  document.getElementById('b-me-mp-num').textContent = '34 / 60 灵';
  document.getElementById('b-enemy-num').textContent = '2140 / 6000';
  document.getElementById('b-me-name').textContent = '『修行者』';
  document.getElementById('b-enemy-name').textContent = '『沧溟蛟』';
  document.getElementById('battle-sub').textContent = '秘境 · 玄级深潭';
  document.getElementById('battle-title').textContent = '遭遇战';
  const meBar = document.getElementById('b-me-bar'); if (meBar) meBar.style.width = '68%';
  const mpBar = document.getElementById('b-me-mp-bar'); if (mpBar) mpBar.style.width = '57%';
  const enBar = document.getElementById('b-enemy-bar'); if (enBar) enBar.style.width = '36%';
  const log = document.getElementById('battle-log');
  if (log) log.innerHTML = '<div>你施展【烈火焚】，烈焰缠上『沧溟蛟』，灼烧 4 层。</div>' +
    '<div>『沧溟蛟』以水法还击，寒冰封住你的身形——冻结生效。</div>' +
    '<div>你身中灼烧，生命流逝 81。你身中中毒，生命流逝 73。</div>';
  const meImg = document.getElementById('b-me-img');
  if (meImg) meImg.src = 'assets/img/portrait/me.png';
</script>
</body></html>`;
const out = path.join(ROOT, '_preview', 'battle_buffs.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page, 'utf8');
console.log('written ' + out + '  (' + page.length + ' bytes, 徽章 ' + (fx.me.length + fx.foe.length) + ' 枚)');
