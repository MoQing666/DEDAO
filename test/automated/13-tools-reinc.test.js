/* DEDAO 自动化测试 —— 13 镜像工具回归（tools/reinc_validate.js）
 *
 * 为什么单独一个模块：`tools/reinc_validate.js` 是**手抄引擎公式**的镜像脚本，
 * 属于「同一个公式的第二实现」——与 `js/*.js` 的守卫住在不同目录、
 * 从不被 `run.js` 跑到，所以必须有地方替它站岗。
 *
 * 2026-09-15 实锤（该脚本已静默跑偏）：
 *   ① 用 `s.broken`（突破次数，每次小阶提升都 +1）算「渡劫分」，
 *      而引擎用的是 `s.tribPassed * 3`（渡劫次数：金丹劫/元婴劫/飞升劫）；
 *      引擎里已有同源前车之鉴 —— 成就 `sanjie` 曾误用 `s.broken`（engine.js:4801 注释）。
 *   ② 漏掉结局乘子 `endMul`（飞升 1.2 / 打破轮回 1.5，engine.js:4740）。
 *   → 它算出的 jie0 整列（6/18/34/55/129）偏低，且自身那条
 *     「全部天赋全满 = 1406」的过期断言一直跑成 ❌（实测 1296），长期没人看。
 *
 * 修法（两层）：
 *   · 脚本内：公式对齐引擎，并新增「测试7 —— 读 `DEDAO_轮回结算重做_方案.md` 断言表内数字」，
 *     把文档 ↔ 实算绑在一起；
 *   · 本模块：再包一层「脚本必须 exit 0 且 0 失败」，让它进入 `node test/automated/run.js` 的常规视野。
 *
 * 注：脚本锚定仓库根（`tools/` 与目标文档都只在仓库有，dist 副本不含），
 * 故本用例在任何 `DEDAO_ROOT` 下校验的都是**仓库那一份**，三种跑法结果一致。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Suite } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('13 镜像工具回归（轮回校验脚本）');

  S.case('tools/reinc_validate.js 全绿退出（引擎公式对齐 + 方案文档数字对账）', (t) => {
    const REPO = path.join(__dirname, '..', '..');
    const tool = path.join(REPO, 'tools', 'reinc_validate.js');
    if (!fs.existsSync(tool)) { t.note('未找到 tools/reinc_validate.js，跳过'); return; }

    let out = '', code = 0;
    try {
      out = execFileSync(process.execPath, [tool], { cwd: REPO, encoding: 'utf8', timeout: 60000 });
    } catch (e) {
      code = (e.status === undefined || e.status === null) ? -1 : e.status;
      out = String(e.stdout || '') + String(e.stderr || '');
    }

    const bad = out.split('\n').filter(function (l) { return l.indexOf('❌') >= 0; });
    t.eq(code, 0,
      'reinc_validate.js 退出码应为 0，实为 ' + code + '。失败项：\n      ' +
      (bad.length ? bad.join('\n      ') : '(无 ❌ 行，可能是脚本自身抛异常)'));
    t.ok(/结果：\d+ 通过 \/ 0 失败/.test(out),
      '脚本应报「0 失败」，实际尾部：' + out.trim().split('\n').slice(-2).join(' | '));
    t.ok(out.indexOf('测试7') >= 0,
      '脚本应含「测试7：方案文档数字与实算对账」—— 缺了说明文档对账段被误删');

    const last = out.trim().split('\n').slice(-1)[0];
    t.note(last);
  });

  /* ---------------------------------------------------------------
     第二道：静态扫描 —— tools/ 下不得再出现「已知会漂移的写法」。
     为什么要有这一条：脚本能"跑通"不代表口径对（旧 reinc_points.js 就跑得通、
     只是整列算错）。下面三条是 2026-09-15 实锤过的具体错法，逐条钉死。
     --------------------------------------------------------------- */
  S.case('tools/ 不得再手抄引擎公式/数据表（已知陈旧写法黑名单 + 必须走 _engine_loader）', (t) => {
    const REPO = path.join(__dirname, '..', '..');
    const dir = path.join(REPO, 'tools');
    if (!fs.existsSync(dir)) { t.note('未找到 tools/ 目录，跳过'); return; }

    /* 必须经 _engine_loader 加载真引擎的脚本（不许自带公式/数据表副本） */
    const MUST_USE_LOADER = ['reinc_validate.js', 'reinc_sim.js', 'reinc_points.js'];

    /* 已知会漂移的写法 → 说明 */
    const FORBID = [
      [/Math\.floor\(\s*[A-Za-z_$][\w$]*\.broken\s*\/\s*3\s*\)/, '渡劫分误用 `s.broken/3`（应为 `s.tribPassed*3`；broken 是突破次数）'],
      [/[+)]\s*[A-Za-z_$][\w$]*\s*\*\s*2\s*;?\s*$/m, '残留 `jie×2` 平加（已删除，现为 `round(base×jie×0.05)`）'],
      [/\b1406\b/, '过期的「全天赋拉满 1406」（实为 1296）'],
    ];

    /* 去掉注释再扫 —— 注释里会引用这些错法作为"前车之鉴"，不应误报 */
    function stripComments(src) {
      return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/[;)}\]]\s*\/\/[^\n]*/g, '');
    }

    const files = fs.readdirSync(dir).filter(f => /\.js$/.test(f) && f !== '_engine_loader.js').sort();
    t.gte(files.length, 5, 'tools/ 下应至少扫到 5 个 js 脚本，实为 ' + files.length);

    let checked = 0;
    files.forEach(function (f) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const code = stripComments(raw);
      checked++;

      if (MUST_USE_LOADER.indexOf(f) >= 0) {
        t.ok(/require\(\s*'\.\/_engine_loader'\s*\)/.test(code),
          f + ' 必须经 `_engine_loader` 加载真引擎（不得再手抄公式/数据表）');
      }
      FORBID.forEach(function (pair) {
        const m = code.match(pair[0]);
        t.ok(!m, f + ' 出现陈旧写法：' + pair[1] +
          (m ? '  → 命中「' + String(m[0]).trim().slice(0, 60) + '」' : ''));
      });
    });
    t.note('已扫 ' + checked + ' 个脚本：' + files.join(' · '));
  });

  return S;
};
