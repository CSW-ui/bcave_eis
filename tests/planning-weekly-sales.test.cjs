const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const {weeklyMetric,salesWeeks,toWeeklySalesProduct,weeklySalesQuery,change}=require('../src/lib/planning-weekly-sales.ts');
const weeks=salesWeeks('2026-10-11'),empty={q:0,a:0,bq:0,ba:0,inbound:0,transfer:0,tag:0,missing:0};
const p=toWeeklySalesProduct({STYLECD:'CO2604HD41',BRANDCD:'CO',STOCK:200,FIRST_SALE:'20260501',HISTORY:{'-2':{...empty,q:10,a:800,inbound:100,tag:1100},'-1':{...empty,q:20,a:1600,tag:2200},'0':{...empty,q:40,a:3200,tag:4400,bq:10,ba:800},'1':{...empty,q:100,a:8000,tag:11000,inbound:150}}});
assert.equal(weeks.length,13);assert.deepEqual(weeks[0],{start:'2026-07-13',end:'2026-07-19',label:'07/19'});
const ex=weeklyMetric(p,0,false,'q',weeks),inc=weeklyMetric(p,0,true,'q',weeks);
assert.equal(ex.tw,30);assert.equal(ex.pw,20);assert.equal(ex.cum.q,70);assert.equal(ex.cum.inbound,100);assert.equal(ex.cum.q,inc.cum.q);assert.equal(ex.trend,'up');assert.ok(Math.abs(ex.discount-.2)<1e-10);
assert.equal(weeklyMetric(p,0,false,'a',weeks).tw,2400);assert.equal(weeklyMetric(p,0,false,'a',weeks).trend,ex.trend);
assert.equal(weeklyMetric({...p,stock:15},0,false,'q',weeks).trend,'short');
assert.equal(weeklyMetric({...p,stock:15,firstSale:'20260713'},0,false,'q',weeks).trend,'new');
assert.equal(change(30,0),null);assert.equal(change(30,-10),null);
assert.equal(weeklyMetric({...p,history:{0:{...empty,q:40,a:100,tag:1000,missing:1}}},0,false,'q',weeks).discount,null);
assert.throws(()=>weeklySalesQuery(['CO\''],'26',['가을'],'2026-10-11'));
assert.throws(()=>weeklySalesQuery(['CO'],'26',['겨울\''],'2026-10-11'));
const sql=weeklySalesQuery(['CO'],'26',['가을'],'2026-10-11');assert.ok(sql.includes("SHOPTYPENM='온라인B2B'"));assert.ok(sql.includes('SALEAMT_VAT_EX'));assert.ok(!sql.includes('SW_SALEINFO'));
if(fs.existsSync('live.json')){
 const products=JSON.parse(fs.readFileSync('live.json')).map(toWeeklySalesProduct);assert.equal(products.length,331);
 for(const product of products){const m=weeklyMetric(product,12,true,'q',weeks);assert.equal(m.cum.q,product.sales);assert.ok(Math.abs(m.cum.a-product.revenue)<.01);assert.equal(m.cum.inbound,product.inbound);assert.equal(m.cum.transfer,product.transfer);assert.equal(m.tw,product.weeks[11]);}
 const metrics=products.map(p=>weeklyMetric(p,12,false,'q',weeks));console.log(JSON.stringify({styles:products.length,weekQty:metrics.reduce((a,r)=>a+r.tw,0),previousQty:metrics.reduce((a,r)=>a+r.pw,0),cumulativeQty:metrics.reduce((a,r)=>a+r.cum.q,0)}));
}
console.log('Weekly sales boundary, B2B, history, discount and live reconciliation passed.');
