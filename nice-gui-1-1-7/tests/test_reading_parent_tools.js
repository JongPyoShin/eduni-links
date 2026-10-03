// Exercise the actual journal inline script with deferred requests and a tiny DOM.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../portal_app/static_games/eduni_reading_journal.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'journal script exists');
const source = match[1].replace('      loadRecords();\n      loadParentInsights();',
  '      window.__journalTest = { loadParentInsights, startEdit };');
assert.notEqual(source, match[1], 'replace startup calls with test exposure');

class Element {
  constructor(tag = 'DIV') {
    this.tagName = tag.toUpperCase(); this.children = []; this.events = {}; this.dataset = {};
    this.value = ''; this.textContent = ''; this.disabled = false; this.files = [];
    this.attrs = {}; this.style = {};
    this.classList = {
      add: name => { this.classes ||= new Set(); this.classes.add(name); },
      remove: name => { this.classes ||= new Set(); this.classes.delete(name); },
      toggle: (name, force) => { this.classes ||= new Set(); const on = force === undefined ? !this.classes.has(name) : force; on ? this.classes.add(name) : this.classes.delete(name); return on; },
      contains: name => Boolean(this.classes && this.classes.has(name)),
    };
  }
  addEventListener(name, callback) { this.events[name] = callback; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] ?? null; }
  removeAttribute(name) { delete this.attrs[name]; if (name === 'src') this.src = ''; }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  querySelectorAll(selector) {
    if (selector === 'input,textarea,button,select') return this.controls || [];
    const result = [];
    const visit = node => { for (const child of node.children || []) { if (selector === 'button' && child.tagName === 'BUTTON') result.push(child); visit(child); } };
    visit(this); return result;
  }
  scrollIntoView() {}
  focus() { this.focused = true; }
  click() { this.clicked = true; }
  reset() { for (const control of this.controls || []) if (control.tagName !== 'BUTTON') control.value = ''; }
  getContext() { return { fillRect() {}, drawImage(image) { this.image = image; } }; }
  toDataURL() { return `data:image/jpeg;base64,${this.lastImage?.src?.includes('manual') ? 'MANUAL' : 'LOOKUP'}`; }
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function main() {
  const inputIds = new Set(['title','lookupPublisher','author','readDate','childComment','favoritePart','parentNote','searchInput','dateFromFilter','dateToFilter','readingModeFilter','ratingFilter','cameraInput','galleryInput']);
  const elements = new Map();
  const form = new Element('form');
  const getElement = id => {
    if (id === 'recordForm') return form;
    if (!elements.has(id)) elements.set(id, new Element(inputIds.has(id) ? (id.toLowerCase().includes('comment') || id === 'favoritePart' || id === 'parentNote' ? 'TEXTAREA' : 'INPUT') : id === 'saveButton' || id === 'findCoverButton' || id === 'scrollToForm' || id === 'cancelEditButton' || id === 'removePhotoButton' || id.endsWith('PickerButton') || id === 'cameraPickerButton' || id === 'galleryPickerButton' ? 'BUTTON' : 'DIV'));
    return elements.get(id);
  };
  const ids = ['title','lookupPublisher','author','readDate','childComment','favoritePart','parentNote','searchInput','dateFromFilter','dateToFilter','readingModeFilter','ratingFilter','cameraInput','galleryInput','cameraPickerButton','galleryPickerButton','coverPicker','coverPreview','saveButton','saveStatus','records','filterToggle','filterPanel','clearFilters','searchSummary','searchSummaryCompact','loadMoreWrap','loadMoreButton','writeTitle','cancelEditButton','removePhotoButton','mobileViewToggle','readingModes','moods','scrollToForm','coverLookupStatus','coverCandidates','insightStatus','insightSummary','insightSuggestion','parentTools','totalCount','monthCount','favoriteCount','writeSection'];
  ids.forEach(getElement);
  form.controls = ['title','lookupPublisher','author','readDate','childComment','favoritePart','parentNote','cameraInput','galleryInput','cameraPickerButton','galleryPickerButton','saveButton','cancelEditButton','removePhotoButton','findCoverButton'].map(getElement);
  form.querySelectorAll = selector => selector === 'input,textarea,button,select' ? [...new Set(form.controls.concat(getElement('coverCandidates').querySelectorAll('button')))] : [];

  const body = new Element('BODY');
  const document = {
    body,
    getElementById: getElement,
    createElement(tag) { const el = new Element(tag); if (tag === 'canvas') { const ctx = { fillRect() {}, drawImage(image) { el.lastImage = image; } }; el.getContext = () => ctx; } return el; },
    querySelectorAll() { return []; },
  };
  class FakeImage {
    constructor() { this.naturalWidth = 640; this.naturalHeight = 480; }
    set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); }
    get src() { return this._src; }
  }
  class FakeFile extends Blob { constructor(parts, name, options) { super(parts, options); this.name = name; } }
  let coverResponse, searchResponse, saveResponse;
  let insightQueue = [];
  let coverFetchCount = 0;
  const requests = [];
  const fetch = (url, options = {}) => {
    requests.push({url,options});
    if (url === '/reading/api/covers/search') return searchResponse.promise;
    if (url.startsWith('/reading/api/covers/')) { coverFetchCount++; return coverResponse.promise; }
    if ((url === '/reading/api/records' && options.method === 'POST') ||
        (url === '/reading/api/records/17' && options.method === 'PUT')) return saveResponse.promise;
    if (url.startsWith('/reading/api/records?')) return Promise.resolve({ok:true,json:async()=>({records:[],total:0,summary:{}})});
    if (url === '/reading/api/insights') return insightQueue.shift() || Promise.resolve({ok:true,json:async()=>({as_of:'2026-10-03',recorded_count:1,distinct_titles:1,repeated_readings:0,reading_modes:{alone:1,together:0,read_aloud:0},recent_30_days:1,previous_30_days:0,recent_period_start:'2026-09-04',previous_period_start:'2026-08-05',previous_period_end:'2026-09-03',insufficient_data:true})});
    throw new Error(`unexpected fetch ${url}`);
  };
  const urlApi = {createObjectURL:file=>`blob:${file.name}`,revokeObjectURL(){}};
  const window = {setTimeout,clearTimeout(){},confirm(){return true;},alert(){},URL:urlApi};
  const sandbox = {window,document,fetch,URL:urlApi,File:FakeFile,Blob,Image:FakeImage,
    setTimeout(){return 1;},setInterval(){return 1;},clearInterval(){},console};
  vm.runInNewContext(source,sandbox);

  const title = getElement('title'), publisher = getElement('lookupPublisher');
  title.value = 'A book'; publisher.value = 'A press';

  // A text change while search is pending invalidates those candidates.
  searchResponse = deferred();
  const staleSearch = getElement('findCoverButton').events.click();
  assert.deepEqual(Object.keys(JSON.parse(requests.at(-1).options.body)).sort(), ['publisher','title']);
  assert.equal(JSON.parse(requests.at(-1).options.body).title, 'A book');
  title.value = 'A newer book'; title.events.input();
  searchResponse.resolve({ok:true,json:async()=>({ok:true,candidates:[{cover_id:42,title:'Old candidate',authors:[],publishers:[]}]})});
  await staleSearch;
  assert.equal(getElement('coverCandidates').children.length,0,'stale search must not resurrect candidates');
  assert.equal(coverFetchCount,0,'search alone must not download/import a cover');

  // A selected provider image arriving late cannot overwrite a newer camera photo.
  searchResponse = deferred();
  const currentSearch = getElement('findCoverButton').events.click();
  searchResponse.resolve({ok:true,json:async()=>({ok:true,candidates:[{cover_id:42,title:'Current candidate',authors:['Writer'],publishers:['Press']}]})});
  await currentSearch;
  const candidateCard = getElement('coverCandidates').children[0];
  const choose = candidateCard.children.find(node=>node.tagName==='BUTTON');
  coverResponse = deferred();
  choose.events.click();
  assert.equal(coverFetchCount,1,'only a confirmed candidate downloads a cover');
  const gallery = getElement('galleryInput');
  gallery.files = [new FakeFile(['manual'], 'manual.jpg', {type:'image/jpeg'})];
  await gallery.events.change({currentTarget:gallery});
  const manualPreview = getElement('coverPreview').src;
  assert.match(manualPreview,/MANUAL/);
  coverResponse.resolve({ok:true,blob:async()=>new Blob(['provider'],{type:'image/jpeg'})});
  await new Promise(setImmediate); await new Promise(setImmediate);
  assert.equal(getElement('coverPreview').src,manualPreview,'late provider import cannot replace the newer manual image');

  // A new-record click during a pending edit must preserve draft fields and photo,
  // including when the save later fails.
  window.__journalTest.startEdit({id:17,title:'Editing draft',author:'Writer',read_date:'2026-10-03',
    reading_mode:'together',rating:4,child_comment:'',favorite_part:'',parent_note:'',cover_url:'/reading/media/saved.jpg'});
  title.value = 'Edited draft title';
  getElement('author').value = 'Edited author';
  const draftPhoto = getElement('coverPreview').src;
  saveResponse = deferred();
  const savePending = form.events.submit({preventDefault(){}});
  assert.equal(title.disabled,true);
  assert.equal(getElement('author').disabled,true);
  assert.equal(requests.at(-1).url,'/reading/api/records/17');
  getElement('scrollToForm').events.click();
  assert.equal(title.value,'Edited draft title','new-record action cannot clear edit draft during PUT');
  assert.equal(getElement('author').value,'Edited author');
  assert.equal(getElement('coverPreview').src,draftPhoto,'new-record action preserves draft photo');
  saveResponse.reject(new Error('temporary save failure'));
  await savePending;
  assert.equal(title.disabled,false);
  assert.equal(title.value,'Edited draft title','failed update preserves draft');
  assert.equal(getElement('author').disabled,false,'controls unlock after failed update');

  // A stale aggregate cannot replace the newest panel result; failed refresh hides old values.
  const firstInsight = deferred(), secondInsight = deferred();
  insightQueue.push(firstInsight.promise,secondInsight.promise);
  const firstLoad = window.__journalTest.loadParentInsights();
  const secondLoad = window.__journalTest.loadParentInsights();
  const currentStats = {as_of:'2026-10-03',recorded_count:9,distinct_titles:7,repeated_readings:2,
    reading_modes:{alone:3,together:4,read_aloud:2},recent_30_days:5,previous_30_days:4,
    recent_period_start:'2026-09-04',previous_period_start:'2026-08-05',previous_period_end:'2026-09-03',insufficient_data:false};
  secondInsight.resolve({ok:true,json:async()=>currentStats});
  await secondLoad;
  firstInsight.resolve({ok:true,json:async()=>({...currentStats,recorded_count:1})});
  await firstLoad;
  assert.match(getElement('insightStatus').textContent,/기록 9건/,'late insight responses do not replace the newest result');
  insightQueue.push(Promise.reject(new Error('offline')));
  await window.__journalTest.loadParentInsights();
  assert.equal(getElement('insightSummary').children.length,0,'failed insight refresh clears stale counts');
  assert.match(getElement('insightSuggestion').textContent,/표시하지 않아요/,'failed refresh clears stale suggestion');
  console.log('PASS: title/publisher-only lookup, explicit import, stale search/image guards, save lock, insights refresh guards');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
