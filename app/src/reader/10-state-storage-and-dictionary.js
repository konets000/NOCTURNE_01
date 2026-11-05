// NOCTURNE reader source fragment; assembled in manifest order by tools/build-reader.js.
  const state={sessions:[],activeId:null,cues:[],selectedCue:-1,selectedWord:null,selectedTokenEl:null,wordTab:'pinyin',language:'zh',importLanguage:'zh',audioUrl:null,loadedAudioName:'',loop:false,playSpeeds:[0.65,0.7,0.75,0.8,0.85,0.9,0.95,1,1.05,1.1,1.15,1.2,1.25,1.3,1.35,1.4,1.45,1.5],speed:1,audioBusy:false,saveTimer:null,saved:new Set(),storageRecovered:false};
  function normalizePlaybackSpeed(value){const requested=Number(value);if(!Number.isFinite(requested))return 1;return Math.round(Math.max(.65,Math.min(1.5,requested))*20)/20;}
  let audioContext=null,mediaElementSource=null,soundTouchNode=null,audioProcessorPromise=null,audioProcessorMode='uninitialized',audioProcessorUnderruns=0;
  let cuePrefixMaxEnd=[];
  function rebuildCuePrefixMaxEnd(){
    cuePrefixMaxEnd=new Array(state.cues.length);
    let maxEnd=-Infinity;
    for(let i=0;i<state.cues.length;i++){
      maxEnd=Math.max(maxEnd,state.cues[i].end);
      cuePrefixMaxEnd[i]=maxEnd;
    }
  }
  const storageFallback=Object.create(null);
  let storageUnavailable=false;
  function getStored(key){try{const v=window.localStorage.getItem(key);return v===null?(Object.prototype.hasOwnProperty.call(storageFallback,key)?storageFallback[key]:null):v;}catch{storageUnavailable=true;return Object.prototype.hasOwnProperty.call(storageFallback,key)?storageFallback[key]:null;}}
  function setStored(key,value){const v=String(value);storageFallback[key]=v;try{window.localStorage.setItem(key,v);return true;}catch{storageUnavailable=true;return false;}}
  function safeParse(v,fallback){try{return JSON.parse(v)||fallback}catch{return fallback}}
  function storageNeedsRepair(raw,parsed,normalized){if(raw===null)return false;try{JSON.parse(raw)}catch{return true}return JSON.stringify(parsed)!==JSON.stringify(normalized)}
  function normalizeStoredSessions(value){
    if(!Array.isArray(value))return [];
    const sessions=[],ids=new Set();
    for(const item of value){
      if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||!/^s[a-z0-9]{5,128}$/i.test(item.id)||ids.has(item.id)||typeof item.name!=='string'||item.name.length>512||typeof item.title!=='string'||item.title.length>512||!Array.isArray(item.cues))continue;
      const cues=[];
      for(const cue of item.cues){
        if(!cue||typeof cue!=='object'||Array.isArray(cue)||!Number.isFinite(cue.start)||cue.start<0||!Number.isFinite(cue.end)||cue.end<=cue.start||typeof cue.text!=='string'||!cue.text.trim()||cue.text.length>MAX_CUE_TEXT_CHARS)continue;
        cues.push({start:cue.start,end:cue.end,text:cue.text});
        if(cues.length>MAX_CUES_PER_SESSION)break;
      }
      if(!cues.length||cues.length>MAX_CUES_PER_SESSION)continue;
      // Playback uses a binary search by start time. Repair old or externally modified
      // browser storage before it reaches that algorithm.
      cues.sort((a,b)=>a.start-b.start||a.end-b.end);
      const lastTime=Number.isFinite(item.lastTime)&&item.lastTime>=0?item.lastTime:0;
      const createdAt=Number.isFinite(item.createdAt)&&item.createdAt>=0?item.createdAt:0;
      sessions.push({id:item.id,name:item.name,title:item.title,cues,lastTime,createdAt,language:['ja','und'].includes(item.language)?item.language:'zh'});ids.add(item.id);
    }
    return sessions.slice(0,20);
  }
  function normalizeSavedWords(value){
    if(!Array.isArray(value))return [];
    return [...new Set(value.filter(word=>typeof word==='string'&&word.trim()&&word.length<=256).map(word=>word.trim()))].slice(0,10000);
  }
  function loadStore(){
    const rawSessionsText=getStored(STORAGE.sessions),rawActive=getStored(STORAGE.active),rawSavedText=getStored(STORAGE.saved);
    const requestedLanguage=getStored(STORAGE.language);state.importLanguage=['zh','ja','auto'].includes(requestedLanguage)?requestedLanguage:'zh';
    const rawSessions=safeParse(rawSessionsText,[]),rawSaved=safeParse(rawSavedText,[]);
    state.sessions=normalizeStoredSessions(rawSessions);
    const activeId=typeof rawActive==='string'?rawActive:null;
    state.activeId=state.sessions.some(session=>session.id===activeId)?activeId:null;
    state.loop=getStored(STORAGE.loop)==='true';
    const speed=Number(getStored(STORAGE.speed));
    state.speed=state.playSpeeds.includes(speed)?speed:1;
    const saved=normalizeSavedWords(rawSaved);state.saved=new Set(saved);
    const sessionsChanged=storageNeedsRepair(rawSessionsText,rawSessions,state.sessions);
    const savedChanged=storageNeedsRepair(rawSavedText,rawSaved,saved);
    const activeChanged=rawActive!==null&&rawActive!==(state.activeId||'');
    const speedStored=getStored(STORAGE.speed),speedChanged=speedStored!==null&&speedStored!==String(state.speed);
    const loopStored=getStored(STORAGE.loop),loopChanged=loopStored!==null&&loopStored!=='true'&&loopStored!=='false';
    state.storageRecovered=sessionsChanged||savedChanged||activeChanged||speedChanged||loopChanged;
    if(sessionsChanged)setStored(STORAGE.sessions,JSON.stringify(state.sessions));
    if(savedChanged)setStored(STORAGE.saved,JSON.stringify(saved));
    if(activeChanged)setStored(STORAGE.active,state.activeId||'');
    if(speedChanged)setStored(STORAGE.speed,String(state.speed));
    if(loopChanged)setStored(STORAGE.loop,String(state.loop));
    $('speedBtn').textContent=state.speed.toFixed(1)+'×';$('loopBtn').classList.toggle('on',state.loop);$('loopBtn').setAttribute('aria-pressed',String(state.loop));
  }
  function persistSessions(){const ok=setStored(STORAGE.sessions,JSON.stringify(state.sessions.slice(0,20)));setStored(STORAGE.active,state.activeId||'');if(!ok)setStatus('Loaded in this session; this browser does not allow persistent storage.',false)}
  function persistSaved(){const ok=setStored(STORAGE.saved,JSON.stringify([...state.saved]));if(!ok)$('savedToast').textContent='Saved for this session; persistent storage is unavailable in this browser context.';}
  function setStatus(text,error=false){$('importStatus').textContent=text;$('importStatus').style.color=error?'var(--danger)':'';}
  function setNotice(text,type=''){const n=$('audioNotice');n.className='notice'+(type?' '+type:'');n.replaceChildren();const b=document.createElement('strong');const parts=text.split(' ');b.textContent=parts.shift()+' ';n.append(b,document.createTextNode(parts.join(' ')));}
  function setDictionaryStatus(text,type=''){const el=$('dictionaryStatus');if(!el)return;el.textContent=text;el.className='dictionary-status'+(type?' '+type:'');}
  function openCedictDb(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){reject(new Error('IndexedDB is unavailable in this browser context.'));return;}const req=indexedDB.open(CEDICT_DB_NAME,CEDICT_DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(CEDICT_DB_STORE))db.createObjectStore(CEDICT_DB_STORE,{keyPath:'key'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Could not open local dictionary storage.'));});}
  async function saveCedictPack(pack){const db=await openCedictDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction(CEDICT_DB_STORE,'readwrite');tx.objectStore(CEDICT_DB_STORE).put(pack);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Could not save CC-CEDICT locally.'));tx.onabort=()=>reject(tx.error||new Error('Saving CC-CEDICT was cancelled.'));});}finally{db.close();}}
  async function loadCedictPack(){const db=await openCedictDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(CEDICT_DB_STORE,'readonly');const req=tx.objectStore(CEDICT_DB_STORE).get('cc-cedict');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||new Error('Could not read stored CC-CEDICT.'));});}finally{db.close();}}
  const TONE_MARKS={a:['ā','á','ǎ','à'],e:['ē','é','ě','è'],i:['ī','í','ǐ','ì'],o:['ō','ó','ǒ','ò'],u:['ū','ú','ǔ','ù'],'ü':['ǖ','ǘ','ǚ','ǜ'],A:['Ā','Á','Ǎ','À'],E:['Ē','É','Ě','È'],I:['Ī','Í','Ǐ','Ì'],O:['Ō','Ó','Ǒ','Ò'],U:['Ū','Ú','Ǔ','Ù'],'Ü':['Ǖ','Ǘ','Ǚ','Ǜ']};
  function numericPinyinToMarks(input){return String(input||'').split(/(\s+)/).map(token=>{if(!token.trim())return token;const m=token.match(/^([^0-9]*?)([0-5])([,.;:!?)]*)$/);if(!m)return token;let syl=m[1].replace(/u:/gi,'ü').replace(/v/gi,'ü');const tone=Number(m[2]);if(tone<1||tone>4)return syl+m[3];let target=-1;const low=syl.toLowerCase();if(low.includes('a'))target=low.lastIndexOf('a');else if(low.includes('e'))target=low.lastIndexOf('e');else if(low.includes('ou'))target=low.lastIndexOf('o');else{for(let k=low.length-1;k>=0;k--){if('aeiouü'.includes(low[k])){target=k;break;}}}if(target>=0){const orig=syl[target];const row=TONE_MARKS[orig];if(row)syl=syl.slice(0,target)+row[tone-1]+syl.slice(target+1);}return syl+m[3];}).join('');}
  function guessPartOfSpeech(glosses){const s=(glosses[0]||'').toLowerCase();const pats=[[/^(?:noun\b|n\.(?=\s|$))/,'noun'],[/^(?:verb\b|v\.(?=\s|$))/,'verb'],[/^(?:adjective\b|adj\.(?=\s|$))/,'adjective'],[/^(?:adverb\b|adv\.(?=\s|$))/,'adverb'],[/^(?:pronoun\b|pron\.(?=\s|$))/,'pronoun'],[/^(?:preposition\b|prep\.(?=\s|$))/,'preposition'],[/^(?:conjunction\b|conj\.(?=\s|$))/,'conjunction'],[/^(?:particle\b|part\.(?=\s|$))/,'particle'],[/^(classifier\b|measure word\b|mw\b)/,'classifier']];for(const [re,pos] of pats)if(re.test(s))return pos;return 'CC-CEDICT entry';}
  function mergeCedictRecord(map,word,record){
    if(!word)return;
    const sense={pinyin:record.pinyin,meaning:record.meaning,pos:record.pos};
    const old=map.get(word);
    if(!old){map.set(word,{word,pinyin:record.pinyin,meaning:record.meaning,pos:record.pos,source:'CC-CEDICT',traditional:record.traditional,simplified:record.simplified,senses:[sense]});return;}
    if(!Array.isArray(old.senses)||!old.senses.length)old.senses=[{pinyin:old.pinyin||'',meaning:old.meaning||'',pos:old.pos||''}];
    if(!old.senses.some(x=>x.pinyin===sense.pinyin&&x.meaning===sense.meaning&&x.pos===sense.pos))old.senses.push(sense);
    const unique=items=>[...new Set(items.filter(Boolean))];
    old.pinyin=unique(old.senses.map(x=>x.pinyin)).join(' / ');
    old.meaning=unique(old.senses.map(x=>x.meaning)).join('；');
    const positions=unique(old.senses.map(x=>x.pos));
    old.pos=positions.length===1?positions[0]:'multiple senses/readings';
  }
  async function parseCedictIntoMap(text,targetMap,onProgress){
    const rx=/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.*)\/\s*$/;
    let pos=0, lines=0, accepted=0, failed=0, maxLen=1;const total=text.length;
    while(pos<total){let end=text.indexOf('\n',pos);if(end<0)end=total;let line=text.slice(pos,end).replace(/\r$/,'').trim();pos=end+1;lines++;if(line&&!line.startsWith('#')){const m=line.match(rx);if(m){const trad=m[1],simp=m[2],py=numericPinyinToMarks(m[3].trim()).replace(/\s+/g,''),defs=m[4].split('/').map(x=>x.trim()).filter(Boolean);if(py&&defs.length){const record={pinyin:py,meaning:defs.join('；') ,pos:guessPartOfSpeech(defs),traditional:trad,simplified:simp};mergeCedictRecord(targetMap,simp,record);if(trad!==simp)mergeCedictRecord(targetMap,trad,record);maxLen=Math.max(maxLen,Array.from(simp).length,Array.from(trad).length);accepted++;}else failed++;}else failed++;}
      if(accepted>0&&accepted%5000===0){onProgress?.(accepted,lines);await new Promise(resolve=>setTimeout(resolve,0));}
    }
    if(accepted<1000)throw new Error(`This does not look like a complete CC-CEDICT text file (only ${accepted} valid entries found). Choose the official UTF-8 export.`);
    return {lines,accepted,failed,maxLen};
  }
  async function decompressBounded(stream,format){
    if(!('DecompressionStream' in window))throw new Error(`${format} decompression is unavailable here. Download the plain .txt export or use a modern Chrome/Android browser.`);
    const reader=stream.pipeThrough(new DecompressionStream(format)).getReader();
    const decoder=new TextDecoder('utf-8',{fatal:true});const parts=[];let total=0;
    try{
      while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>CEDICT_MAX_BYTES){await reader.cancel();throw new Error(`The expanded dictionary exceeds the ${Math.floor(CEDICT_MAX_BYTES/1024/1024)} MB safety limit.`);}parts.push(decoder.decode(value,{stream:true}));}
      return parts.join('')+decoder.decode();
    }finally{reader.releaseLock();}
  }
  async function decompressGzip(buf){return decompressBounded(new Blob([buf]).stream(),'gzip');}
  function requireZipRange(offset,length,limit){if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<0||offset>limit-length)throw new Error('The ZIP has invalid entry offsets. Choose the official .txt.gz download.');}
  async function extractCedictZip(buf){const bytes=new Uint8Array(buf);const view=new DataView(buf);let eocd=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===bytes.length){eocd=i;break;}}if(eocd<0)throw new Error('Could not find the ZIP directory. Try the official .txt.gz download instead.');const count=view.getUint16(eocd+10,true);let p=view.getUint32(eocd+16,true);for(let n=0;n<count;n++){requireZipRange(p,46,bytes.length);if(view.getUint32(p,true)!==0x02014b50)throw new Error('The ZIP directory is malformed. Choose the official .txt.gz download.');const flags=view.getUint16(p+8,true),method=view.getUint16(p+10,true),csize=view.getUint32(p+20,true),nameLen=view.getUint16(p+28,true),extraLen=view.getUint16(p+30,true),commentLen=view.getUint16(p+32,true),local=view.getUint32(p+42,true);requireZipRange(p+46,nameLen+extraLen+commentLen,bytes.length);const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.slice(p+46,p+46+nameLen));if(/cedict.*\.(txt|u8)$/i.test(name)||(/\.(txt|u8)$/i.test(name)&&!/readme|license/i.test(name))){if(flags&1)throw new Error('Encrypted ZIP files are not supported. Choose the official .txt.gz download.');requireZipRange(local,30,bytes.length);if(view.getUint32(local,true)!==0x04034b50)throw new Error('The ZIP entry is malformed. Choose the official .txt.gz download.');const ln=view.getUint16(local+26,true),le=view.getUint16(local+28,true),start=local+30+ln+le;requireZipRange(start,csize,bytes.length);const packed=bytes.slice(start,start+csize);if(method===0){if(packed.byteLength>CEDICT_MAX_BYTES)throw new Error(`The expanded dictionary exceeds the ${Math.floor(CEDICT_MAX_BYTES/1024/1024)} MB safety limit.`);return new TextDecoder('utf-8',{fatal:true}).decode(packed);}if(method===8)return decompressBounded(new Blob([packed]).stream(),'deflate-raw');throw new Error(`Unsupported ZIP compression method ${method}. Choose the official .txt.gz download.`);}p+=46+nameLen+extraLen+commentLen;}throw new Error('The ZIP does not contain a recognisable CC-CEDICT .txt or .u8 file.');}
  async function readCedictFile(file){if(file.size>35*1024*1024)throw new Error('Dictionary file is unusually large (>35 MB). Choose the official .txt.gz or .zip export.');const buf=await file.arrayBuffer();let text;if(/\.gz$/i.test(file.name)||file.type==='application/gzip'||file.type==='application/x-gzip')text=await decompressGzip(buf);else if(/\.zip$/i.test(file.name)||file.type==='application/zip')text=await extractCedictZip(buf);else text=decodeSubtitleBuffer(buf);if(text.length>CEDICT_MAX_BYTES)throw new Error('The expanded dictionary exceeds the 60 MB safety limit.');return text;}
  async function installCedictTextNow(text,filename='CC-CEDICT export',persist=true){if(cedictLoading)throw new Error('A dictionary operation is already running.');cedictLoading=true;setDictionaryStatus('Reading and indexing CC-CEDICT…');const next=new Map();try{const meta=await parseCedictIntoMap(text,next,(n)=>setDictionaryStatus(`Indexing CC-CEDICT · ${n.toLocaleString()} source entries processed…`));CEDICT.clear();for(const [k,v] of next)CEDICT.set(k,v);cedictImportedRecords=meta.accepted;cedictRawSize=text.length;maxDictionaryWordLength=Math.max(maxDictionaryWordLength,meta.maxLen);if(persist){try{await saveCedictPack({key:'cc-cedict',text,filename,entries:meta.accepted,importedAt:Date.now(),header:(text.match(/^#.*?date:\s*([^\n]+)/m)||[])[1]||'',userImported:true});setDictionaryStatus(`CC-CEDICT installed · ${meta.accepted.toLocaleString()} source entries · ${CEDICT.size.toLocaleString()} searchable forms · stored locally`, 'ok');}catch(err){setDictionaryStatus(`CC-CEDICT loaded for this session (${meta.accepted.toLocaleString()} entries) but could not be saved permanently: ${err.message}`,'warn');}}else setDictionaryStatus(`CC-CEDICT restored · ${meta.accepted.toLocaleString()} source entries · ${CEDICT.size.toLocaleString()} searchable forms · offline`, 'ok');
      // Re-render transcript because improved segmentation may alter token boundaries.
      const old=state.selectedCue;const session=getSession();if(session){renderSession();if(old>=0&&state.cues.length)selectCue(Math.min(old,state.cues.length-1),{seek:false,scroll:false,persist:false});}if(state.selectedWord)renderWordTab();
      if(persist)manualCedictImportInstalled=true;return meta;
    }finally{cedictLoading=false;}}
  function installCedictText(text,filename='CC-CEDICT export',persist=true){
    if(persist)manualCedictImportRequested=true;
    const run=()=>{if(!persist&&manualCedictImportRequested)return null;return installCedictTextNow(text,filename,persist);};
    const job=cedictInstallQueue.then(run,run);cedictInstallQueue=job.catch(()=>{});return job;
  }
  // Bundled dictionaries are served same-origin by the Android WebViewAssetLoader under /dictionary/.
  // Each file is decompressed on the Java side, so no base64 crosses the JS bridge and no DecompressionStream is needed.
  // Outside the Android shell (standalone HTML) the request fails and the app falls back to imported/character-level data.
  async function fetchBundled(name){
    try{const res=await fetch('/dictionary/'+name,{cache:'no-store'});if(!res.ok)return null;return await res.text();}
    catch{return null;}
  }
  async function restoreBundledUnihan(){
    try{
      const unihanText=await fetchBundled('unihan-characters.json');if(!unihanText)return 0;
      setDictionaryStatus('Loading bundled Unicode character definitions…');
      const rows=JSON.parse(unihanText);let loaded=0;
      for(const row of rows){if(!Array.isArray(row)||!row[0])continue;const ch=row[0];const rawReadings=String(row[1]||'');const fallback=BROAD_CHAR_PINYIN.get(ch)||rawReadings.split(/[;,\s]+/).filter(Boolean)[0]||'';const record={word:ch,pinyin:fallback,meaning:String(row[2]||''),pos:'character',source:'Unihan',pinyinVariants:rawReadings};UNIHAN_CHARACTERS.set(ch,record);loaded++;}
      return loaded;
    }catch(err){console.warn('NOCTURNE: Unihan fallback pack was not loaded',err);setDictionaryStatus('Unicode character definitions could not be loaded; broad built-in character readings remain available.','warn');return 0;}
  }
  function parseSegmentationRow(line){
    const tab=String(line||'').lastIndexOf('\t');
    if(tab<1)return null;
    const word=String(line).slice(0,tab).trim();
    const freq=Number(String(line).slice(tab+1).trim());
    if(!word||Array.from(word).length>12||!Number.isFinite(freq)||freq<1||!Array.from(word).every(ch=>HAN.test(ch)))return null;
    return {word,freq};
  }
  async function restoreBundledSegmentation(){
    try{
      const segText=await fetchBundled('segmentation.txt');if(!segText)return 0;
      setDictionaryStatus('Loading frequency-ranked Chinese word lexicon…');
      const text=segText;let loaded=0,maxLen=maxDictionaryWordLength,total=0;
      let pos=0;
      while(pos<text.length){
        let end=text.indexOf('\n',pos);if(end<0)end=text.length;
        const line=text.slice(pos,end).replace(/\r$/,'').trim();pos=end+1;if(!line)continue;
        const parsed=parseSegmentationRow(line);if(!parsed)continue;
        const {word,freq}=parsed;const len=Array.from(word).length;
        SEGMENTATION_FREQUENCY.set(word,freq);total+=freq;
        maxLen=Math.max(maxLen,len);loaded++;
        if(loaded%12000===0)await new Promise(resolve=>setTimeout(resolve,0));
      }
      maxDictionaryWordLength=maxLen;SEGMENTATION_TOTAL_FREQUENCY=total;
      const session=getSession();if(session)renderSession();if(state.selectedWord)renderWordTab();
      setDictionaryStatus(`Chinese segmentation lexicon ready · ${loaded.toLocaleString()} words · frequency model loaded`,'ok');
      return loaded;
    }catch(err){console.warn('NOCTURNE: supplemental segmentation dictionary did not load',err);return 0;}
  }
  async function restoreCedict(){
    if(manualCedictImportRequested||manualCedictImportInstalled)return CEDICT.size>0;
    let storedPack=null,storageError=null;
    try{storedPack=await loadCedictPack();}catch(err){storageError=err;}
    let bundledEntries=0;
    const manifestText=await fetchBundled('manifest.json');
    if(manifestText){try{const bundledManifest=JSON.parse(manifestText);bundledEntries=Number(bundledManifest?.ccCedict?.validSourceEntries)||0;}catch(err){console.warn('NOCTURNE: bundled dictionary manifest unavailable',err);}}
    const hasBundledCorpus=bundledEntries>0;
    bundledCedictAvailable=hasBundledCorpus;
    // A validated bundle supersedes old automatic snapshots, but never an explicitly imported user corpus.
    const storedEntries=Number(storedPack?.entries)||0;
    const preferBundled=hasBundledCorpus&&bundledEntries>=100000&&!storedPack?.userImported&&(!storedPack?.text||storedEntries<=bundledEntries);
    async function restoreStored(){
      if(!storedPack?.text)return false;
      try{return !!(await installCedictText(storedPack.text,storedPack.filename||'CC-CEDICT',false));}
      catch(err){storageError=err;return false;}
    }
    if(!(manualCedictImportRequested||manualCedictImportInstalled)&&storedPack?.text&&!preferBundled&&await restoreStored())return true;
    if(hasBundledCorpus){
      try{
        const text=await fetchBundled('cc-cedict.txt');
        if(text&&!manualCedictImportRequested&&!manualCedictImportInstalled){setDictionaryStatus('Loading bundled CC-CEDICT · validating and indexing entries…');const meta=await installCedictText(text,'Bundled CC-CEDICT',false);if(meta){setDictionaryStatus(`Bundled CC-CEDICT ready · ${meta.accepted.toLocaleString()} source entries · ${CEDICT.size.toLocaleString()} searchable forms · embedded in this app · offline`,'ok');return true;}}
      }catch(err){console.warn('NOCTURNE: bundled CC-CEDICT could not be loaded',err);setDictionaryStatus(`Bundled word dictionary failed to load: ${err.message}. Trying any saved dictionary; character-level lookup remains available.`,'warn');}
    }
    if(manualCedictImportRequested||manualCedictImportInstalled)return CEDICT.size>0;
    if(storedPack?.text&&await restoreStored())return true;
    const status=`Broad character readings · ${BROAD_CHAR_PINYIN.size.toLocaleString()} mapped characters · ${UNIHAN_CHARACTERS.size.toLocaleString()} Unicode character records · no full word dictionary available`;
    setDictionaryStatus(storageError?`${status} · local dictionary storage unavailable` : status,'warn');
    return false;
  }
  async function restoreDictionaries(){
    await restoreBundledUnihan();
    await restoreBundledSegmentation();
    await restoreCedict();
  }
    async function handleCedictFile(file){if(!file)return;manualCedictImportRequested=true;try{if(!(/\.(txt|u8|gz|zip)$/i.test(file.name)))throw new Error('Choose a CC-CEDICT .txt, .u8, .txt.gz, or .zip file.');setDictionaryStatus(`Opening ${file.name}…`);const text=await readCedictFile(file);const meta=await installCedictText(text,file.name,true);$('sheetToast').textContent='';setStatus(`CC-CEDICT installed: ${meta.accepted.toLocaleString()} entries. Your SRT files are unchanged.`); }catch(err){manualCedictImportRequested=false;void restoreCedict();setDictionaryStatus(err.message||'Dictionary import failed.','error');}finally{$('cedictInput').value='';}}

