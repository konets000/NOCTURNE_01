// NOCTURNE reader source fragment; assembled in manifest order by tools/build-reader.js.
  function getCharacterInfo(ch){
    const found=CEDICT.get(ch)||CHAR.get(ch)||DICT.get(ch);
    const unicodeRecord=UNIHAN_CHARACTERS.get(ch);
    if(found&&(found.pinyin||found.meaning)){
      return {...found, unihanMeaning:unicodeRecord?.meaning||'', pinyinFallback:BROAD_CHAR_PINYIN.get(ch)||'', pinyinVariants:unicodeRecord?.pinyin||''};
    }
    const reading=BROAD_CHAR_PINYIN.get(ch)||unicodeRecord?.pinyin||'';
    if(unicodeRecord||reading){
      return {word:ch,pinyin:reading,meaning:unicodeRecord?.meaning||'',pos:'character',source:unicodeRecord?.meaning?'Unihan':'broad-character-reading',pinyinVariants:unicodeRecord?.pinyin||''};
    }
    return found||{word:ch,pinyin:'',meaning:'',pos:'not found',source:'missing'};
  }
  function decomposeUnknownWord(word){
    const cps=Array.from(String(word||''));const n=cps.length;if(n<2)return [];
    const best=new Array(n+1).fill(-Infinity);const next=new Array(n).fill(1);best[n]=0;
    for(let i=n-1;i>=0;i--){
      const ch=cps[i];const ci=getCharacterInfo(ch);let lenChosen=1;
      let scoreChosen=candidateLogProbability(ch)+best[i+1];
      const limit=Math.min(n-i,maxDictionaryWordLength||12,12);
      for(let len=2;len<=limit;len++){
        if(i===0&&len===n)continue;
        const candidate=cps.slice(i,i+len).join('');
        const info=CEDICT.get(candidate)||DICT.get(candidate)||CHAR.get(candidate)||UNIHAN_CHARACTERS.get(candidate);
        if(!info||(!info.pinyin&&!info.meaning))continue;
        const freq=SEGMENTATION_FREQUENCY.get(candidate)||(CEDICT.has(candidate)?1000:800);
        const total=SEGMENTATION_TOTAL_FREQUENCY>0?SEGMENTATION_TOTAL_FREQUENCY:100000000;const score=Math.log(Math.max(1,freq))-Math.log(total)+best[i+len];
        if(score>scoreChosen+1e-9||(Math.abs(score-scoreChosen)<=1e-9&&len>lenChosen)){scoreChosen=score;lenChosen=len;}
      }
      best[i]=scoreChosen;next[i]=lenChosen;
    }
    const parts=[];for(let i=0;i<n;){const len=Math.max(1,next[i]||1);const text=cps.slice(i,i+len).join('');let info=CEDICT.get(text)||DICT.get(text)||CHAR.get(text)||UNIHAN_CHARACTERS.get(text);if(!info&&Array.from(text).length===1)info=getCharacterInfo(text);parts.push({word:text,info:info||{word:text,pinyin:BROAD_CHAR_PINYIN.get(text)||'',meaning:'',source:'missing'}});i+=len;}return parts;
  }
  function getInfo(word){
    const found=CEDICT.get(word)||DICT.get(word)||CHAR.get(word);
    if(found)return found;
    const chars=Array.from(String(word||''));
    if(chars.length===1)return getCharacterInfo(chars[0]);
    if(chars.length>1&&chars.every(ch=>HAN.test(ch))){
      const characters=chars.map(getCharacterInfo);const components=decomposeUnknownWord(word);
      const usefulComponents=components.filter(part=>part.info&&(part.info.meaning||part.info.pinyin));
      const hasUsefulWholeWordParts=usefulComponents.some(part=>Array.from(part.word).length>1&&(part.info.meaning||part.info.source==='CC-CEDICT'));
      if(hasUsefulWholeWordParts){
        const pinyin=usefulComponents.map(part=>part.info.pinyin||Array.from(part.word).map(ch=>BROAD_CHAR_PINYIN.get(ch)||'…').join(' ')).join(' · ');
        return {word,pinyin,meaning:'',pos:'unlisted compound · component clues only',source:SEGMENTATION_FREQUENCY.has(word)?'segmentation-only':'decomposed-fallback',components:usefulComponents,characters};
      }
      if(characters.some(c=>c.pinyin||c.meaning)){
        return {word,pinyin:characters.map(c=>c.pinyin||'…').join(' '),meaning:'',pos:'character-level fallback · not a verified word entry',source:SEGMENTATION_FREQUENCY.has(word)?'segmentation-only':'character-fallback',characters,components:usefulComponents};
      }
    }
    return {word,pinyin:'',meaning:'',pos:'not found',source:'missing'};
  }
  function missingWordHelp(){return CEDICT.size===0?'No whole-word entry was found in the compact starter vocabulary. Character-level pronunciation fallback is available; import CC-CEDICT for broad verified word definitions.':'No whole-word entry was found in the installed dictionary. Character readings and any available individual-character glosses are shown as clues, not as a compound translation.';}
    function createEl(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
  function label(text){return createEl('div','detail-label',text)}
  function getSenseGroups(info){
    const senses=Array.isArray(info?.senses)&&info.senses.length?info.senses:[{pinyin:info?.pinyin||'',meaning:info?.meaning||'',pos:info?.pos||''}];
    const groups=new Map();
    for(const sense of senses){const pinyin=sense.pinyin||'Pronunciation unavailable';if(!groups.has(pinyin))groups.set(pinyin,{pinyin,meanings:[],positions:[]});const group=groups.get(pinyin);for(const meaning of String(sense.meaning||'').split('；').map(x=>x.trim()).filter(Boolean))if(!group.meanings.includes(meaning))group.meanings.push(meaning);const pos=String(sense.pos||'').trim();if(pos&&!group.positions.includes(pos))group.positions.push(pos);}
    return [...groups.values()];
  }
  function renderWordTab(){
    const word=state.selectedWord||'';
    const host=$('wordDetail');host.replaceChildren();
    if(state.language==='und'){
      host.append(label('UNCLASSIFIED TEXT'));
      host.append(createEl('div','fineprint','Auto mode could not identify this text as Chinese or Japanese. It is shown with generic word boundaries only. Select Chinese or Japanese and re-import the subtitle to enable that language’s dictionary and speech settings. NOCTURNE will not apply Chinese pinyin or Chinese definitions to unclassified text.'));
      const cue=state.cues[state.selectedCue];
      if(cue){host.append(label('CURRENT SUBTITLE'));host.append(createEl('div','contextline',cue.text));}
      return;
    }
    if(state.language==='ja'){
      host.append(label('JAPANESE WORD'));
      host.append(createEl('div','pronounce-card', 'Offline segmentation: '+(window.NocturneJapaneseCore&&window.NocturneJapaneseCore.segmentJapanese(word).length?'available':'unavailable')));
      host.append(createEl('div','fineprint','The Japanese tokenizer adapter is active, but the Japanese dictionary pack is not installed in this build yet. NOCTURNE will not invent a reading, lemma or definition. The full JMdict/Jitendex, kanji and morphology assets are a separate integration step.'));
      const cue=state.cues[state.selectedCue];
      if(cue){host.append(label('CURRENT SUBTITLE'));host.append(createEl('div','contextline',cue.text));}
      return;
    }
    const info=getInfo(word);
    const senseGroups=getSenseGroups(info);
    document.querySelectorAll('.tab').forEach(b=>{const active=b.dataset.tab===state.wordTab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
    
    const fallbackSources=new Set(['character-fallback','broad-character-reading']);
    if(state.wordTab==='pinyin'){
      host.append(label(info.source==='character-fallback'?'CHARACTER-LEVEL READING FALLBACK':senseGroups.length>1?'PRONUNCIATION VARIANTS':'PRONUNCIATION'));
      if(info.source==='missing'){
        const card=createEl('div','pronounce-card');const left=createEl('div');left.append(createEl('div','pronounce','Pronunciation not available'));left.append(createEl('div','tonehelp',missingWordHelp()));const speak=createEl('button','listenbtn','♫');speak.type='button';speak.setAttribute('aria-label','Speak selected word using system speech');speak.addEventListener('click',speakWord);card.append(left,speak);host.append(card);
      }else{
        senseGroups.forEach((group,index)=>{
          const card=createEl('div','pronounce-card');const left=createEl('div');
          left.append(createEl('div','pronounce',group.pinyin==='Pronunciation unavailable'?'Not available offline':group.pinyin));
          let gloss=group.meanings.length?group.meanings.join('；'):
            info.source==='character-fallback'?'Character readings joined for reference only. A compound can have a different lexical pronunciation.':
            info.source==='segmentation-only'?'The segmentation lexicon recognizes this word boundary, but no bilingual dictionary entry was found. Readings are character-level approximations.':
            info.source==='broad-character-reading'?'Fallback reading for this individual character. Whole-word dictionary readings take priority.':
            info.source==='Unihan'?'Character reading from Unicode Unihan data.':
            (info.pinyin?'Tone-marked pronunciation from the local dictionary.':'No word-level pinyin is available.');
          left.append(createEl('div','tonehelp',gloss));
          const usefulPos=group.positions.filter(x=>x!=='CC-CEDICT entry');if(usefulPos.length)left.append(createEl('div','tonehelp',usefulPos.join(' / ')));
          if(index===0){const speak=createEl('button','listenbtn','♫');speak.type='button';speak.setAttribute('aria-label','Speak selected word using system speech');speak.addEventListener('click',speakWord);card.append(left,speak);}else card.append(left);
          host.append(card);
        });
      }
      const foot=info.source==='CC-CEDICT'?'Whole-word readings and definitions are grouped by dictionary pronunciation. A sentence may still require contextual interpretation.':
        info.source==='missing'?missingWordHelp():
        info.source==='character-fallback'?'This is not a verified word-level pronunciation. Import the bundled CC-CEDICT corpus for whole-word readings.':
        info.source==='segmentation-only'?'This term is recognized for word-boundary purposes only. A whole-word pronunciation and definition were not found in CC-CEDICT.':
        info.source==='broad-character-reading'?'This broad character-reading fallback may contain only one common reading for a polyphonic character. Unicode character readings are not context disambiguation.':
        'Word-level dictionary entries take priority over character-level fallback readings.';
      host.append(createEl('div','fineprint',foot));
    }else if(state.wordTab==='meaning'){
      if(info.source==='missing'){
        host.append(label('DICTIONARY STATUS'),createEl('div','notice',missingWordHelp()));
      }else if(info.source==='character-fallback'||info.source==='segmentation-only'||info.source==='decomposed-fallback'){
        const hasComponents=Array.isArray(info.components)&&info.components.some(part=>Array.from(part.word||'').length>1&&(part.info?.meaning||part.info?.source==='CC-CEDICT'));
        host.append(label(hasComponents?'KNOWN COMPONENTS · NO EXACT COMPOUND ENTRY':info.source==='segmentation-only'?'SEGMENTATION MATCH · NO WORD DEFINITION':'CHARACTER CLUES · NOT A WORD TRANSLATION'));
        host.append(createEl('div','notice',hasComponents?'No exact entry for this complete form was found. The list below breaks it into known dictionary words or characters; these are clues, not a verified translation of the compound.':info.source==='segmentation-only'?'The word-boundary lexicon recognizes this form, but no exact bilingual entry was found. Character meanings below are clues, not a compound translation.':'No exact whole-word definition was found. Character meanings below are clues, not a compound translation.'));
        const clues=createEl('div','chars');
        const items=hasComponents?info.components.map(part=>({word:part.word,info:part.info})): (info.characters||[]).map(ci=>({word:ci.word,info:ci}));
        for(const item of items){const ci=item.info||{};const card=createEl('div','charcard');card.append(createEl('div','charbig',item.word),createEl('div','charpinyin',ci.pinyin||'Reading unavailable'),createEl('div','charmeaning',ci.meaning||'No English gloss in this data source'));if(ci.pos)card.append(createEl('div','tonehelp',ci.pos));clues.append(card);}
        host.append(clues);
      }else if(info.source==='broad-character-reading'&&!info.meaning){
        host.append(label('CHARACTER MEANING'));
        host.append(createEl('div','notice','The broad character-reading data supplies a pronunciation, but this character has no English gloss in the current standalone pack. The full Android build also bundles Unicode character definitions.'));
      }else{
        host.append(label(senseGroups.length>1?'MEANINGS GROUPED BY PRONUNCIATION':'DICTIONARY MEANING'));
        senseGroups.forEach(group=>{
          if(info.source==='CC-CEDICT'||senseGroups.length>1)host.append(createEl('div','part-speech',`${group.pinyin}${group.positions.filter(x=>x!=='CC-CEDICT entry').length?' · '+group.positions.filter(x=>x!=='CC-CEDICT entry').join(' / '):''}`));
          else host.append(createEl('div','part-speech',info.pos||'word'));
          host.append(createEl('div','definition',group.meanings.join('；')||'No verified English gloss is available for this entry.'));
        });
      }
      const cue=state.cues[state.selectedCue];if(cue)host.append(createEl('div','example',cue.text));
      const save=createEl('button','btn small '+(state.saved.has(word)?'active':''),state.saved.has(word)?'★ Saved to vocabulary':'☆ Save this word');save.addEventListener('click',()=>toggleSaved(word));host.append(save);
      host.append(createEl('div','fineprint',info.source==='CC-CEDICT'?'Dictionary senses are not an automatic translation of the whole sentence.':info.source==='character-fallback'?'Character glosses provide hints only; Chinese compounds cannot reliably be translated by adding individual character meanings.':(info.source==='segmentation-only'||info.source==='decomposed-fallback')?'Component meanings are evidence about parts, not a verified English translation of the full word.':''));
    }else if(state.wordTab==='characters'){
      host.append(label('CHARACTERS IN THIS WORD'));
      const grid=createEl('div','chars');
      for(const ch of Array.from(word)){
        const ci=getCharacterInfo(ch);const card=createEl('div','charcard');
        card.append(createEl('div','charbig',ch),createEl('div','charpinyin',ci.pinyin||'Reading unavailable'),createEl('div','charmeaning',ci.meaning||'Pinyin available; no English character gloss in this data source.'));
        if(ci.pinyinVariants&&ci.pinyinVariants!==ci.pinyin)card.append(createEl('div','tonehelp','Unicode readings: '+ci.pinyinVariants));
        grid.append(card);
      }
      host.append(grid);host.append(createEl('div','fineprint','Character glosses are not a claim about historical etymology and are not guaranteed to determine a compound’s meaning. Whole-word dictionary readings take priority.'));
    }else{
      host.append(label('CURRENT SUBTITLE'));const cue=state.cues[state.selectedCue];host.append(createEl('div','contextline',cue?cue.text:'No current sentence.'));
      host.append(label('WORD-BY-WORD GLOSS'));const glosses=createEl('div','glosses');
      if(cue){for(const token of segment(cue.text).filter(t=>t.word)){const inf=getInfo(token.text);const chip=createEl('div','gloss-chip');let msg=inf.meaning|| (inf.source==='character-fallback'?'Character clues only · no whole-word gloss':inf.source==='broad-character-reading'?'Character reading only · no English gloss':'No local gloss');chip.append(createEl('b','',token.text),createEl('span','',`${inf.pinyin||'—'} · ${msg}`));glosses.append(chip);}}
      host.append(glosses);host.append(createEl('div','fineprint','This view provides local word glosses in context. It does not generate a full-sentence translation for arbitrary subtitles.'));
    }
  }

    function speakWord(){const word=state.selectedWord;if(!word)return;if(state.language==='und'){$('sheetToast').textContent='Select a language and re-import this subtitle before using language-specific speech.';return;}if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance){$('sheetToast').textContent='System speech is unavailable in this environment.';return;}const utter=new SpeechSynthesisUtterance(word);utter.lang=state.language==='ja'?'ja-JP':'zh-CN';const voices=speechSynthesis.getVoices();const voicePrefix=state.language==='ja'?'ja':'zh';const voice=voices.find(v=>new RegExp('^'+voicePrefix+'(-|_|$)','i').test(v.lang));if(voice)utter.voice=voice;else {$('sheetToast').textContent='No matching system voice was found. Speech availability and offline support depend on the installed device voice.';}speechSynthesis.cancel();speechSynthesis.speak(utter);}
  function toggleSaved(word){if(state.saved.has(word))state.saved.delete(word);else state.saved.add(word);persistSaved();updateSavedCount();renderWordTab();$('sheetToast').textContent=state.saved.has(word)?'Saved locally.':'Removed from saved words.';}
  function updateSavedCount(){$('savedCount').textContent=state.saved?.size?`(${state.saved.size})`:'';}
  function renderLibrary(){
    const host=$('libraryList');host.replaceChildren();
    if(!state.sessions.length){host.append(createEl('div','notice','No saved reading documents yet. Import a text or SRT file to create your local library.'));return;}
    for(const s of state.sessions){
      const row=createEl('div','library-item'),main=createEl('div','library-main');
      const isText=s.mode==='text',unit=isText?'text blocks':'subtitles';
      main.append(createEl('div','library-name',s.title),createEl('div','library-sub',s.cues.length+' '+unit+' · '+s.name));
      const actions=createEl('div','');actions.style.display='flex';actions.style.gap='6px';
      const open=createEl('button','btn small '+(s.id===state.activeId?'active':''),s.id===state.activeId?'Current':'Open');
      open.addEventListener('click',()=>{if(s.id!==state.activeId)activateSession(s.id);$('libraryModal').classList.remove('open');$('libraryModal').setAttribute('aria-hidden','true');$('modalBackdrop').classList.remove('open');document.body.style.overflow='';});
      const del=createEl('button','btn small ghost','×');del.setAttribute('aria-label','Delete '+s.title);
      del.addEventListener('click',()=>{if(!confirm('Delete "'+s.title+'" from this device library?'))return;state.sessions=state.sessions.filter(x=>x.id!==s.id);if(state.activeId===s.id){state.activeId=state.sessions[0]?.id||null;if(state.activeId)activateSession(state.activeId);else{state.cues=[];state.selectedCue=-1;renderSession();stopAudioAndUnload();persistSessions();}}persistSessions();renderLibrary();});
      actions.append(open,del);row.append(main,actions);host.append(row);
    }
  }
  function renderSaved(){const host=$('savedList');host.replaceChildren();if(!state.saved.size){host.append(createEl('div','notice','Nothing saved yet. Tap a word in the transcript and choose “Save this word”.'));return;}for(const word of [...state.saved].sort((a,b)=>a.localeCompare(b))){const info=state.language==='zh'?getInfo(word):null;const row=createEl('div','saved-item');const main=createEl('div','');main.append(createEl('div','saved-word',word),createEl('div','saved-desc',info?`${info.pinyin||'Pinyin not found'} · ${info.meaning||'No dictionary meaning available'}`:'Saved text · switch to its language to see supported dictionary information'));const open=createEl('button','btn small','Open');open.addEventListener('click',()=>{closeModal();pickWord(word,state.selectedCue,null);});const remove=createEl('button','btn small ghost','×');remove.setAttribute('aria-label','Remove '+word);remove.addEventListener('click',()=>{state.saved.delete(word);persistSaved();renderSaved();updateSavedCount();});const buttons=createEl('div','');buttons.style.display='flex';buttons.style.gap='5px';buttons.append(open,remove);row.append(main,buttons);host.append(row);}}
  function openModal(id){closeSheet();for(const x of ['libraryModal','savedModal']){$(x).classList.toggle('open',x===id);$(x).setAttribute('aria-hidden',String(x!==id));}if(id==='libraryModal')renderLibrary();if(id==='savedModal')renderSaved();$('modalBackdrop').classList.add('open');document.body.style.overflow='hidden';}
  function closeModal(){for(const x of ['libraryModal','savedModal']){$(x).classList.remove('open');$(x).setAttribute('aria-hidden','true');}$('modalBackdrop').classList.remove('open');document.body.style.overflow='';}
  $('languageSelect').addEventListener('change',e=>{const value=['zh','ja','auto'].includes(e.target.value)?e.target.value:'zh';state.importLanguage=value;setStored(STORAGE.language,value);updateLanguageNote();});
  function updateLanguageNote(){
    const note=$('languageNote');if(!note)return;
    const suffix=' Plain .txt documents preserve all paragraph text without subtitle filtering or invented timestamps.';
    if(state.importLanguage==='ja'){
      note.querySelector('.language-mode-label').textContent='JAPANESE MODE';
      note.querySelector('.language-note-text').textContent='Japanese SRT wording is preserved. Word segmentation runs locally with the browser Japanese segmenter; full dictionary readings, grammar and definitions are not bundled yet.'+suffix;
    }else if(state.importLanguage==='auto'){
      note.querySelector('.language-mode-label').textContent='AUTO DETECTION';
      note.querySelector('.language-note-text').textContent='Kana selects Japanese. Han-only text defaults to Chinese because it is ambiguous. Other text stays unclassified and uses generic word boundaries without Chinese definitions or Mandarin speech.'+suffix;
    }else{
      note.querySelector('.language-mode-label').textContent='HANZI-ONLY SRT FILTER';
      note.querySelector('.language-note-text').textContent='For Chinese SRTs, Hanzi lines are kept, pinyin/English-only cues are skipped, and inline Latin text is stripped from mixed lines. Plain .txt documents are not filtered.'+suffix;
    }
  }
  $('importDictBtn').addEventListener('click',()=>$('cedictInput').click());$('cedictInput').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)handleCedictFile(f);});$('importSrtBtn').addEventListener('click',()=>$('srtInput').click());$('emptyImportBtn').addEventListener('click',()=>$('srtInput').click());$('reloadSrtBtn').addEventListener('click',()=>$('srtInput').click());$('importAudioBtn').addEventListener('click',()=>$('audioInput').click());$('srtInput').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)importSubtitleFile(f);e.target.value='';});$('audioInput').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)addAudioFile(f);e.target.value='';});
  $('playBtn').addEventListener('click',playAudio);$('backBtn').addEventListener('click',()=>seekTo(($('audio').currentTime||0)-5));$('forwardBtn').addEventListener('click',()=>seekTo(($('audio').currentTime||0)+5));$('prevCueBtn').addEventListener('click',()=>selectCue(currentCueIndex()-1,{seek:true,play:!$('audio').paused}));$('nextCueBtn').addEventListener('click',()=>selectCue(currentCueIndex()+1,{seek:true,play:!$('audio').paused}));$('seekInput').addEventListener('input',e=>{const a=$('audio');if(state.audioUrl&&Number.isFinite(a.duration)){seekTo((Number(e.target.value)/1000)*a.duration);}});$('seekTrack').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){seekTo(($('audio').currentTime||0)-2);e.preventDefault()}if(e.key==='ArrowRight'){seekTo(($('audio').currentTime||0)+2);e.preventDefault()}});$('loopBtn').addEventListener('click',()=>{state.loop=!state.loop;$('loopBtn').classList.toggle('on',state.loop);$('loopBtn').setAttribute('aria-pressed',String(state.loop));setStored(STORAGE.loop,String(state.loop));});$('speedRange').addEventListener('input',e=>setPlaybackSpeed(Number(e.target.value)));$('speedBtn').addEventListener('click',()=>setPlaybackSpeed(.8));
  $('audio').addEventListener('loadedmetadata',()=>{updateAudioDisplay();setPlaybackSpeed(state.speed,false);const s=getSession();if(s&&s.lastTime>0){$('audio').currentTime=Math.min(s.lastTime,$('audio').duration||s.lastTime);s.lastTime=0;persistSessions();}syncCueToAudio();});$('audio').addEventListener('timeupdate',()=>{updateAudioDisplay();if(state.loop&&getSession()?.mode!=='text'&&state.selectedCue>=0{const c=state.cues[state.selectedCue];if(c&&$('audio').currentTime>=c.end){$('audio').currentTime=c.start;updateAudioDisplay();}}syncCueToAudio();if(!state.saveTimer){state.saveTimer=setTimeout(()=>{saveSession();state.saveTimer=null;},5000);}});$('audio').addEventListener('play',()=>{$('playBtn').textContent='Ⅱ';$('playBtn').setAttribute('aria-label','Pause audio');$('playerState').textContent='PLAYING';});$('audio').addEventListener('pause',()=>{$('playBtn').textContent='▶';$('playBtn').setAttribute('aria-label','Play audio');if(state.audioUrl)$('playerState').textContent='PAUSED';saveSession();});$('audio').addEventListener('ended',()=>{if(state.loop&&getSession()?.mode!=='text'&&state.selectedCue>=0{const c=state.cues[state.selectedCue];if(c){$('audio').currentTime=c.start;playAudio();return;}}$('playerState').textContent='FINISHED';});$('audio').addEventListener('error',()=>{if(state.audioUrl){setNotice('The selected audio could not be decoded by this device. Try MP3, M4A/AAC, WAV, or OGG.','error');}});
  $('libraryBtn').addEventListener('click',()=>openModal('libraryModal'));$('savedBtn').addEventListener('click',()=>openModal('savedModal'));$('closeSheetBtn').addEventListener('click',closeSheet);$('sheetBackdrop').addEventListener('click',closeSheet);$('modalBackdrop').addEventListener('click',closeModal);document.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModal));document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{state.wordTab=b.dataset.tab;renderWordTab();}));document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSheet();closeModal();}if((e.code==='Space')&&!['BUTTON','INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&state.audioUrl){e.preventDefault();playAudio();}});window.addEventListener('pagehide',saveSession);
  function init(){
    loadStore();$('languageSelect').value=state.importLanguage;updateLanguageNote();
    if(state.activeId&&state.sessions.some(s=>s.id===state.activeId)){
      const s=getSession();state.language=['ja','und'].includes(s.language)?s.language:'zh';state.cues=s.cues.map((c,i)=>({...c,id:i}));renderSession();state.activeId=s.id;
      setStatus(s.mode==='text'?'Restored saved text.':'Restored saved subtitles. Re-select audio to listen.');
      setNotice(s.mode==='text'?'Your text document was restored from local storage. It has no subtitle timestamps; this build does not generate speech.':'Your SRT was restored from local storage. Select its audio file again to resume synchronized listening.');
    }else{renderSession();}
    updateSavedCount();setPlaybackSpeed(state.speed,false);updateSpeedMode('PITCH-PRESERVING PROCESSING · READY');
    if(state.storageRecovered)setStatus('Some saved local data was invalid or outdated and has been cleared.',true);
  }
  init();
  restoreDictionaries();
  // Minimal public hooks support dismissal from a native Android wrapper without exposing file paths.
  window.Nocturne={dismissOverlays:()=>{if($('wordSheet').classList.contains('open')){closeSheet();return true;}if($('libraryModal').classList.contains('open')||$('savedModal').classList.contains('open')){closeModal();return true;}return false;},version:'0.8.1',dictionaryStats:()=>({installed:CEDICT.size>0,sourceEntries:cedictImportedRecords,searchableForms:CEDICT.size,characterReadings:BROAD_CHAR_PINYIN.size,unicodeCharacters:UNIHAN_CHARACTERS.size,segmentationTerms:SEGMENTATION_FREQUENCY.size,frequencyTerms:SEGMENTATION_FREQUENCY.size,frequencyTotal:SEGMENTATION_TOTAL_FREQUENCY,bundled:bundledCedictAvailable})};
