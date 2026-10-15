const assert=require('node:assert/strict');
const {test}=require('node:test');
const ts=require('typescript');
const Module=require('node:module');
const fs=require('node:fs');
const loaded=new Module(__filename,module);
loaded._compile(ts.transpileModule(fs.readFileSync('src/lib/auth-network.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,__filename);
const {authServerFetch,isTransientAuthFailure}=loaded.exports;
async function mockedFetch(fn,run){const original=global.fetch;global.fetch=fn;try{await run();}finally{global.fetch=original;}}
test('only temporary failures are recoverable',()=>{
 for(const error of [{status:0},{status:503},new TypeError('fetch failed',{cause:{code:'ECONNRESET'}})])assert.equal(isTransientAuthFailure(error),true);
 for(const error of [{status:400},{status:401},{status:403},{status:429},new Error('bad token'),null])assert.equal(isTransientAuthFailure(error),false);
});
test('read requests recover from a dropped connection and carry a timeout signal',async()=>{
 let calls=0;
 await mockedFetch(async(_input,init)=>{assert.ok(init.signal instanceof AbortSignal);if(++calls===1)throw new TypeError('fetch failed',{cause:{code:'ECONNRESET'}});return new Response('ok');},async()=>assert.equal(await (await authServerFetch('https://example.test/user')).text(),'ok'));
 assert.equal(calls,2);
});
test('persistent read failures are bounded to three attempts',async()=>{
 let calls=0;await mockedFetch(async()=>{calls++;return new Response('',{status:503});},async()=>assert.equal((await authServerFetch('https://example.test/user')).status,503));assert.equal(calls,3);
});
test('mutating requests are never replayed even if the response was lost',async()=>{
 for(const method of ['POST','PUT','DELETE']){
 let calls=0;await mockedFetch(async()=>{calls++;throw new TypeError('fetch failed',{cause:{code:'ECONNRESET'}});},async()=>assert.rejects(authServerFetch('https://example.test/verify',{method})));assert.equal(calls,1);
 }
});
test('rate limits and authentication denials are returned without retries',async()=>{
 for(const status of [400,401,403,429]){let calls=0;await mockedFetch(async()=>{calls++;return new Response('',{status});},async()=>assert.equal((await authServerFetch('https://example.test/user')).status,status));assert.equal(calls,1);}
});
test('caller cancellation prevents recovery',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 await mockedFetch(async()=>{calls++;throw new DOMException('Aborted','AbortError');},async()=>assert.rejects(authServerFetch('https://example.test/user',{signal:controller.signal})));assert.equal(calls,1);
});
