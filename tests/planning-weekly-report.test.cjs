const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
function load(file){const m=new Module(path.resolve(file));m.paths=module.paths;m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);return m.exports;}
const report=load('src/lib/planning-weekly-report.ts'),images=load('src/lib/planning-product-images.ts');
assert.equal(report.lastClosedSunday(new Date('2026-10-13T23:00:00Z')),'2026-10-11');
assert.equal(report.lastClosedSunday(new Date('2026-10-10T23:00:00Z')),'2026-10-04');
assert.equal(report.lastClosedSunday(new Date('2026-10-11T15:01:00Z')),'2026-10-11');
assert.equal(report.validReportDate('2026-02-30'),false);
assert.throws(()=>report.weeklyQuery(['CO\''],'26',['가을'],'2026-10-11'));
assert.throws(()=>report.weeklyQuery(['CO'],'26',['가을\''],'2026-10-11'));
const query=report.weeklyQuery(['CO'],'26',['가을'],'2026-10-11');
assert.ok(query.includes('SALEAMT_VAT_EX'));assert.ok(query.includes("WHINDT <= '20261011'"));assert.ok(query.includes("ORDDT <= '20261011'"));assert.ok(query.includes("SHOPCD NOT IN ('B6055','B6057','B6063')"));assert.ok(!query.includes('SW_SALEINFO'));
const row={BRANDCD:'CO',STYLECD:'CO2607CA16',STYLENM:'test',IN_QTY:100,TRF_QTY:20,SALE_QTY:40,STOCK:60,COLORS:'[{"code":"BK","name":"BLACK","orderQty":50}]',W8:1,W9:1,W10:2,W11:2};
const p=report.toWeeklyProduct(row);assert.equal(p.sellThrough,.5);assert.equal(p.trend,'up');assert.equal(p.woh,40);assert.equal(p.poor,true);assert.equal(p.colors[0].code,'BK');assert.equal(report.toWeeklyProduct({...row,IN_QTY:0,TRF_QTY:0}).sellThrough,null);
assert.equal(report.toWeeklyProduct({...row,STOCK:-1}).poor,false);
const url='https://bmbx-prd.my.commercecloud.salesforce.com/dw/image/v2/x/CO2607CA16BK_1_hash.jpg';
assert.equal(images.extractMallImage(`<img src="${url}?sw=800&amp;q=60">`,'CO','CO2607CA16BK','https://www.covernat.co.kr/product/CO2607CA16BK'),url+'?sw=800&q=60');
assert.equal(images.extractMallImage(`<img src="${url}">`,'CO','CO2607CA16PI','https://www.covernat.co.kr/product/CO2607CA16PI'),null);
assert.equal(images.extractMallImage('<meta property="og:image" content="https://leekorea.co.kr/logo.jpg">','LE','LE2603IP32BR','https://leekorea.co.kr/'),null);
assert.equal(images.extractMallImage('<meta name="description" content="상품 LE2603IP32BR"><meta property="og:image" content="https://evil.example/x.jpg">','LE','LE2603IP32BR','https://leekorea.co.kr/'),null);
assert.deepEqual(images.leeSearchCandidates('anchorBoxId_1 <div class="xans-search-result"><li id="anchorBoxId_17727"></li></div><div class="xans-search-paging">anchorBoxId_9'),['17727']);
const liveFile='live-query-result.json';if(fs.existsSync(liveFile)){const rows=JSON.parse(fs.readFileSync(liveFile,'utf8')).map(report.toWeeklyProduct);assert.equal(rows.length,896);assert.ok(rows.every(p=>Number.isFinite(p.sales)&&Number.isFinite(p.stock)&&p.weeks.length===12));assert.equal(new Set(rows.map(p=>p.brand+'|'+p.style)).size,rows.length);console.log('Live query rows validated:',rows.length);}
console.log('Planning report tests passed.');
