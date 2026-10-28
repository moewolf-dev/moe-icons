import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {KIND,createRecorder,digestString,summary,writeReport}=require('./small-pack-consumer-transport.cjs');

const times=()=>{let index=0;return()=>`2026-10-28T00:00:0${index++}Z`;};

test('a verified single download is complete and measured',()=>{
 const recorder=createRecorder({scope:'free-durable-retrieve',now:times()});
 recorder.record({callId:'call-1',route:'repos/moewolf-dev/moe-icons-code-library/actions/artifacts/7/zip',attempt:1,status:'complete',responseBytes:1024,deliveredBytes:1024,expectedBytes:1024,digestVerified:true});
 const report=recorder.close();
 assert.equal(report.kind,KIND);
 assert.equal(report.scope,'free-durable-retrieve');
 assert.equal(report.complete,true);
 assert.deepEqual(report.bypassRisk,[]);
 assert.equal(report.totals.calls,1);
 assert.equal(report.totals.attempts,1);
 assert.equal(report.totals.retries,0);
 assert.equal(report.totals.responseBytes,1024);
 assert.equal(report.totals.verifiedDownloads,1);
 assert.equal(report.reportSha256,digestString({...report,reportSha256:undefined}));
});

test('a transient retry keeps the failed attempt unknown instead of zero',()=>{
 const recorder=createRecorder({scope:'free-durable-retrieve',now:times()});
 recorder.record({callId:'call-1',route:'repos/moewolf-dev/moe-icons-code-library/actions/artifacts/7/zip',attempt:1,status:'failed',responseBytes:null,deliveredBytes:100,expectedBytes:1024,errorClass:'transient',httpStatus:503});
 recorder.record({callId:'call-1',route:'repos/moewolf-dev/moe-icons-code-library/actions/artifacts/7/zip',attempt:2,status:'complete',responseBytes:1024,deliveredBytes:1024,expectedBytes:1024,digestVerified:true});
 const report=recorder.close();
 assert.equal(report.totals.attempts,2);
 assert.equal(report.totals.retries,1);
 assert.equal(report.totals.retriedCalls,1);
 assert.equal(report.totals.failedAttempts,1);
 assert.equal(report.totals.unknownResponses,1);
 assert.equal(report.totals.deliveredBytesOnFailure,100);
 assert.equal(report.totals.verifiedDownloads,1);
 assert.equal(report.complete,false);
 assert.ok(report.bypassRisk.includes('unknown-response-bytes'));
});

test('an expected lookup failure does not hide a complete download',()=>{
 const recorder=createRecorder({scope:'free-durable-retrieve',now:times()});
 recorder.record({callId:'probe',route:'repos/x/releases/tags/missing',attempt:1,status:'failed',responseBytes:null,deliveredBytes:0,expectedFailure:true,httpStatus:404});
 recorder.record({callId:'call-1',route:'repos/x/actions/artifacts/7/zip',attempt:1,status:'complete',responseBytes:10,deliveredBytes:10,expectedBytes:10,digestVerified:true});
 const report=recorder.close();
 assert.equal(report.totals.expectedFailedAttempts,1);
 assert.equal(report.totals.unknownResponses,0);
 assert.equal(report.complete,true);
 assert.deepEqual(report.bypassRisk,[]);
});

test('a failed call is reported as failed, never as a zero-byte success',()=>{
 const recorder=createRecorder({scope:'free-durable-retrieve',now:times()});
 for(let attempt=1;attempt<=3;attempt+=1){
  recorder.record({callId:'call-1',route:'repos/x/releases/assets/9',attempt,status:'failed',responseBytes:null,deliveredBytes:attempt===1?5:0,expectedBytes:64,errorClass:'transient',httpStatus:503});
 }
 const report=recorder.close();
 assert.equal(report.totals.attempts,3);
 assert.equal(report.totals.retries,2);
 assert.equal(report.totals.failedCalls,1);
 assert.equal(report.totals.responseBytes,0);
 assert.equal(report.totals.deliveredBytesOnFailure,5);
 assert.equal(report.complete,false);
 assert.ok(report.bypassRisk.includes('failed-download-call'));
});

test('a window with no measured downloads is incomplete',()=>{
 const recorder=createRecorder({scope:'free-durable-retrieve',now:times()});
 const report=recorder.close();
 assert.equal(report.complete,false);
 assert.ok(report.bypassRisk.includes('no-measured-downloads'));
 assert.equal(report.totals.attempts,0);
});

test('the recorder rejects values that would silently become zero or a lie',()=>{
 const recorder=createRecorder({scope:'free-durable-retrieve'});
 assert.throws(()=>recorder.record({callId:'c',route:'r',attempt:1,status:'complete',responseBytes:null}),/requires responseBytes/);
 assert.throws(()=>recorder.record({callId:'c',route:'r',attempt:1,status:'failed',responseBytes:10}),/must leave responseBytes unknown/);
 assert.throws(()=>recorder.record({callId:'c',route:'r',attempt:1,status:'complete',responseBytes:-1}),/non-negative/);
 assert.throws(()=>recorder.record({callId:'c',route:'r',attempt:0,status:'complete',responseBytes:1}),/positive integer/);
 assert.throws(()=>recorder.record({callId:'c',route:'r',attempt:1,status:'complete',responseBytes:10,deliveredBytes:11}),/exceeds/);
 assert.throws(()=>recorder.record({callId:'c',route:'r',attempt:1,status:'skipped',responseBytes:1}),/complete or failed/);
 assert.throws(()=>createRecorder({scope:'bad scope'}),/scope must/);
 recorder.close();
 assert.throws(()=>recorder.record({callId:'c',route:'r',attempt:1,status:'complete',responseBytes:1}),/closed/);
});

test('writeReport writes the digest-bound report atomically with owner-only mode',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'consumer-transport-'));
 try{
  const recorder=createRecorder({scope:'free-durable-retrieve',now:times()});
  recorder.record({callId:'c',route:'r',attempt:1,status:'complete',responseBytes:3,deliveredBytes:3,expectedBytes:3,digestVerified:true});
  const report=recorder.close();
  const file=path.join(dir,'nested','transport.json');
  writeReport(file,report);
  assert.equal(fs.statSync(file).mode&0o777,0o600);
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),report);
  const described=summary(report,{reportPath:file});
  assert.equal(described.scope,'free-durable-retrieve');
  assert.equal(described.complete,true);
  assert.equal(described.reportPath,file);
  assert.equal(described.reportSha256,report.reportSha256);
  assert.equal(fs.readdirSync(path.dirname(file)).length,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
