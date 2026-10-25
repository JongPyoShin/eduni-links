"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {WORDS}=require("../nice-gui-1-1-7/portal_app/phonics_static/phonics.js");
const {TYPES,MODES,makeQuestion,buildRound}=require("./practice.js");

test("six original question modes reuse curated word bank",()=>{
  assert.equal(TYPES.length,6);
  assert.equal(WORDS.length,24);
  assert.deepEqual(MODES,["mix","listen","picture","missing","order","first","meaning"]);
});
test("all 24 curated words support each of six modes with valid choices",()=>{
  for(const word of WORDS){
    const bank=WORDS.filter(w=>w.level===word.level);
    for(const {id} of TYPES){
      const q=makeQuestion(word,id,bank,()=>0.37);
      assert.equal(q.word,word.word);
      assert.ok(q.correct);
      if(id==="order"){
        assert.equal(q.options.length,word.sounds.length);
        assert.deepEqual(
          q.options.map(x=>x.value).sort(),
          word.sounds.map(x=>x.grapheme).sort());
      }else{
        assert.equal(q.options.length,4);
        assert.equal(q.options.filter(x=>x.value===q.correct).length,1);
        assert.equal(new Set(q.options.map(x=>x.value)).size,4);
      }
      if(id==="missing"){
        assert.match(q.visual,/＿/);
        assert.equal(q.visual.split(" · ").length,word.sounds.length);
      }
    }
  }
});
test("mixed rounds are 8 unique words and cover all six modes",()=>{
  for(const level of ["start","more","all"]){
    const round=buildRound(WORDS,level,"mix",()=>0.37);
    assert.equal(round.length,8);
    assert.equal(new Set(round.map(q=>q.word)).size,8);
    assert.equal(new Set(round.map(q=>q.type)).size,6);
  }
});
test("individual modes remain selectable and targets respect level",()=>{
  for(const {id} of TYPES){
    for(const level of ["start","more"]){
      const round=buildRound(WORDS,level,id,()=>0.37);
      assert.equal(round.length,8);
      assert.ok(round.every(q=>q.type===id));
      assert.ok(round.every(q=>WORDS.find(w=>w.word===q.word).level===level));
    }
  }
});
test("bad modes and too-small banks cannot silently create a round",()=>{
  assert.throws(()=>buildRound(WORDS,"start","invalid"));
  assert.throws(()=>buildRound(WORDS,"invalid","mix"));
  assert.throws(()=>buildRound(WORDS.slice(0,2),"all","mix"));
});
