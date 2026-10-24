"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {WORDS,forLevel,normalize,evaluate,SOUND}=require("../portal_app/phonics_static/phonics.js");
test("24 curated words across two progressively harder levels",()=>{
  assert.equal(WORDS.length,24);
  assert.equal(forLevel("start").length,12);
  assert.equal(forLevel("more").length,12);
  assert.equal(forLevel("all").length,24);
  assert.deepEqual(forLevel("missing"),[]);
});
test("phonics letter tiles exactly spell word including digraphs",()=>{
  for(const w of WORDS){
    assert.equal(w.sounds.map(x=>x.grapheme).join(""),w.word);
    assert.ok(w.sounds.length>=3&&w.sounds.length<=4);
    for(const s of w.sounds){
      assert.match(s.ipa,/^\/.+\/$/);
      assert.ok(s.cue&&s.cue.length>0);
    }
    assert.ok(w.meaning&&w.emoji);
  }
  assert.equal(new Set(WORDS.map(w=>w.word)).size,WORDS.length);
  assert.deepEqual(WORDS.find(w=>w.word==="ship").sounds.map(s=>s.grapheme),["sh","i","p"]);
  assert.deepEqual(WORDS.find(w=>w.word==="cat").sounds.map(s=>s.grapheme),["c","a","t"]);
});
test("word recognition uses complete word matches, not Levenshtein guesses",()=>{
  assert.equal(evaluate("cat",["cat"]).status,"match");
  assert.equal(evaluate("cat",["the cat"]).status,"match");
  assert.equal(evaluate("cat",["bat","the cat"]).status,"match");
  assert.equal(evaluate("cat",["bat"]).status,"retry");
  assert.equal(evaluate("pen",["pin"]).status,"retry");
  assert.equal(evaluate("cat",["cats"]).status,"retry");
  assert.equal(evaluate("sun",["son"]).status,"match");
  assert.equal(evaluate("red",["read"]).status,"match");
  assert.equal(evaluate("ten",["10"]).status,"match");
  assert.equal(evaluate("cat",[]).status,"empty");
});
test("transcripts are normalized without HTML interpretation",()=>{
  assert.equal(normalize(" The  CAT!  "),"the cat");
  assert.equal(normalize('<img src=x onerror=alert(1)>'),"img src x onerror alert");
});
test("phoneme inventory is complete and not synthesized from unknown spellings",()=>{
  for(const w of WORDS)for(const s of w.sounds){
    assert.ok(s.ipa && s.cue);
  }
  assert.ok(SOUND.sh&&SOUND.ch&&SOUND.th);
});
