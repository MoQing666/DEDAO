/* DEDAO 自动化测试总入口
 * 用法：
 *   node test/automated/run.js                       # 测试主版本 DEDAO
 *   DEDAO_ROOT=D:/opencode/DEDAO_test node ...       # 测试其它副本
 */
const fs = require('fs');
const path = require('path');

// 让测试能找到隔离工作区里的 jsdom
const WS = path.join('C:', 'Users', 'Lenovo', '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules');
if (fs.existsSync(WS) && !module.paths.includes(WS)) module.paths.push(WS);

const { ROOT } = require('./_harness');

const MODULES = [
  ['01-static-data.test.js', '静态一致性 & 数据完整性'],
  ['02-engine-sim.test.js', '引擎单元测试 & 长时模拟'],
  ['03-ui.test.js', 'UI / DOM 层'],
];

function bar(pass, fail) {
  const total = pass + fail || 1;
  const n = 24, p = Math.round((pass / total) * n);
  return '[' + '█'.repeat(p) + '░'.repeat(n - p) + ']';
}

(async () => {
  console.log('='.repeat(70));
  console.log('DEDAO 全量自动化测试');
  console.log('目标目录:', ROOT);
  console.log('开始时间:', new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(70));

  const report = [];
  for (const [file, label] of MODULES) {
    const p = path.join(__dirname, file);
    if (!fs.existsSync(p)) { console.log(`\n[跳过] ${file} 不存在`); continue; }
    let builder;
    try { builder = require(p); }
    catch (e) {
      console.log(`\n[加载失败] ${file}: ${e.message}`);
      report.push({ suite: label, title: '模块加载', pass: false, error: e.message, messages: [], notes: [], ms: 0 });
      continue;
    }
    let S;
    try { S = await builder(); }
    catch (e) { console.log(`\n[构建失败] ${file}: ${e.message}`); continue; }
    await S.run(report);
  }

  /* ---------- 控制台输出 ---------- */
  const suites = [...new Set(report.map(r => r.suite))];
  for (const s of suites) {
    const rs = report.filter(r => r.suite === s);
    const p = rs.filter(r => r.pass).length;
    console.log(`\n──── ${s} ${bar(p, rs.length - p)} ${p}/${rs.length} ────`);
    for (const r of rs) {
      console.log(`  ${r.pass ? '✓' : '✗'} ${r.title}  (${r.ms}ms)`);
      r.notes.forEach(n => console.log(`      · ${n}`));
      if (r.error) console.log(`      ⚠ 异常: ${r.error}`);
      r.messages.slice(0, 6).forEach(m => console.log(`      ✗ ${m}`));
      if (r.messages.length > 6) console.log(`      ... 另有 ${r.messages.length - 6} 条`);
      (r.warns || []).slice(0, 4).forEach(m => console.log(`      ⚠ 风险: ${m}`));
    }
  }

  const total = report.length;
  const passed = report.filter(r => r.pass).length;
  const failed = total - passed;
  const warned = report.filter(r => r.warns && r.warns.length).length;

  console.log('\n' + '='.repeat(70));
  console.log(`总计: ${passed}/${total} 通过` + (failed ? `，${failed} 失败` : '，全部通过') + (warned ? `，${warned} 项风险` : ''));
  console.log('='.repeat(70));

  /* ---------- 生成 Markdown 报告 ---------- */
  const outDir = path.join(ROOT, 'test', 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const outFile = path.join(outDir, `test-report-${stamp}.md`);

  const L = [];
  L.push('# DEDAO 全量测试报告');
  L.push('');
  L.push(`- 目标目录：\`${ROOT}\``);
  L.push(`- 运行时间：${new Date().toLocaleString('zh-CN')}`);
  L.push(`- 结果：**${passed}/${total} 通过**${failed ? `，${failed} 失败` : ''}${warned ? `，${warned} 项风险` : ''}`);
  L.push('');
  L.push('## 汇总');
  L.push('');
  L.push('| 测试套件 | 用例数 | 通过 | 失败 |');
  L.push('|---|---:|---:|---:|');
  for (const s of suites) {
    const rs = report.filter(r => r.suite === s);
    L.push(`| ${s} | ${rs.length} | ${rs.filter(r => r.pass).length} | ${rs.filter(r => !r.pass).length} |`);
  }
  L.push(`| **合计** | **${total}** | **${passed}** | **${failed}** |`);
  L.push('');
  L.push('## 明细');
  L.push('');
  L.push('| 结果 | 套件 | 用例 | 说明 |');
  L.push('|:--:|---|---|---|');
  for (const r of report) {
    const msgs = [...r.notes.map(n => 'ℹ ' + n), ...(r.error ? ['⚠ ' + r.error] : []), ...r.messages, ...(r.warns || []).map(w => '⚠ 风险: ' + w)].join('<br>');
    L.push(`| ${r.pass ? '✅' : '❌'} | ${r.suite} | ${r.title.replace(/\|/g, '\\|')} | ${msgs.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`);
  }
  L.push('');
  fs.writeFileSync(outFile, L.join('\n'), 'utf8');
  console.log('\n报告已生成:', outFile);

  process.exit(failed ? 1 : 0);
})();
