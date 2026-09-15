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

  return S;
};
