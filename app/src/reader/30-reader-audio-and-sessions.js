// NOCTURNE reader source fragment; assembled in manifest order by tools/build-reader.js.
  function cueToLineParts(text,container){const lines=text.split('\n');lines.forEach((line,idx)=>{if(idx)container.append(document.createElement('br'));for(const token of segment(line)){if(token.word){const btn=document.createElement('button');btn.type='button';btn.className='word';btn.textContent=token.text;btn.dataset.word=token.text;btn.setAttribute('aria-label','Explore '+token.text);container.append(btn);}else{const span=document.createElement('span');span.className='cue-punct';span.textContent=token.text;container.append(span);}}});}
  function getSession(){return state.sessions.find(s=>s.id===state.activeId)||null;}
  function saveSession(){const s=getSession();if(!s)return;s.lastTime=s.mode==='text'?0:(state.audioUrl?Number($('audio').currentTime)||0:(state.cues[state.selectedCue]?.start||0));persistSessions();}
  function createSession(name,cues,language='zh',mode='srt'){
    const base=name.replace(/\.(srt|txt)$/i,'')||'Untitled session';
    const session={id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,title:base,cues:cues.map(c=>({start:mode==='text'?null:c.start,end:mode==='text'?null:c.end,text:c.text})),lastTime:0,createdAt:Date.now(),language:['ja','und'].includes(language)?language:'zh'};
    if(mode==='text')session.mode='text';
    state.sessions.unshift(session);state.sessions=state.sessions.slice(0,20);state.activeId=session.id;persistSessions();activateSession(session.id);
  }
  function activateSession(id){
    const s=state.sessions.find(x=>x.id===id);if(!s)return;
    state.language=['ja','und'].includes(s.language)?s.language:'zh';
    if(state.audioUrl&&basename(s.name)!==basename(state.loadedAudioName))stopAudioAndUnload();
    state.activeId=id;state.cues=s.cues.map((c,i)=>({...c,id:i}));state.selectedCue=-1;renderSession();persistSessions();
    setStatus(state.cues.length+' '+(s.mode==='text'?'text blocks':'subtitles')+' ready'+(storageUnavailable?' · session-only in this browser':' · saved locally'));
  }
  function renderSession(){
    rebuildCuePrefixMaxEnd();
    const s=getSession(),loaded=!!s,isText=s?.mode==='text';
    $('emptyState').hidden=loaded;$('loadedReader').hidden=!loaded;
    $('loopBtn').disabled=!!isText;
    if(!s){$('fileChips').innerHTML='<span class="file-chip">No document imported yet</span>';return;}
    $('sessionTitle').textContent=s.title;
    $('readerEyebrow').textContent=isText?(s.language==='ja'?'JAPANESE TEXT':s.language==='und'?'LOCAL TEXT':'CHINESE TEXT'):(s.language==='ja'?'JAPANESE SUBTITLES':s.language==='und'?'LOCAL SUBTITLES':'CHINESE SUBTITLES');
    $('cueCountLabel').textContent=state.cues.length+' '+(isText?(state.cues.length===1?'text block':'text blocks'):(state.cues.length===1?'subtitle':'subtitles'));
    $('timingLabel').textContent=isText?'Untimed text · no media synchronization':fmt(state.cues[0]?.start||0)+' – '+fmt(state.cues[state.cues.length-1]?.end||0);
    $('fileChips').replaceChildren();
    const srtChip=document.createElement('span');srtChip.className='file-chip';srtChip.textContent='▤ '+s.name;$('fileChips').append(srtChip);
    if(state.loadedAudioName){const ac=document.createElement('span');ac.className='file-chip';ac.textContent='♫ '+state.loadedAudioName;$('fileChips').append(ac);}
    $('transcript').replaceChildren();
    const fragment=document.createDocumentFragment();
    state.cues.forEach((c,i)=>{
      const article=document.createElement('article');article.className='cue';article.dataset.cue=String(i);
      const stamp=document.createElement('div');stamp.className='cue-time';stamp.textContent=isText?String(i+1).padStart(2,'0'):fmt(c.start);
      const body=document.createElement('div');body.className='cue-body';const text=document.createElement('div');text.className='cue-text';cueToLineParts(c.text,text);
      body.append(text);article.append(stamp,body);
      article.addEventListener('click',e=>{const w=e.target.closest('button.word');if(w){selectCue(i,{seek:false,scroll:false});pickWord(w.dataset.word,i,w);e.stopPropagation();}else selectCue(i,{seek:true,play:false});});
      fragment.append(article);
    });
    $('transcript').append(fragment);
    if(state.cues.length){selectCue(0,{seek:false,scroll:false,persist:false});if(!isText&&s.lastTime>0&&state.audioUrl)$('audio').currentTime=Math.min(s.lastTime,$('audio').duration||s.lastTime);}
    updateAudioDisplay();updateSavedCount();
  }
  function selectCue(i,{seek=false,play=false,scroll=true,persist=true}={}){if(!state.cues.length)return;i=Math.max(0,Math.min(state.cues.length-1,i));state.selectedCue=i;document.querySelectorAll('.cue').forEach((el,j)=>{el.classList.toggle('active',j===i);if(j===i)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');});const c=state.cues[i];$('currentCueLabel').textContent=`LINE ${String(i+1).padStart(2,'0')} / ${state.cues.length}`;if(seek&&state.audioUrl&&getSession()?.mode!=='text')$('audio').currentTime=c.start;if(scroll){const el=$('transcript').querySelector(`[data-cue="${i}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});}if(persist)saveSession();}
  function syncCueToAudio(){
    if(!state.audioUrl||!state.cues.length||getSession()?.mode==='text')return;
    const t=$('audio').currentTime, threshold=t-0.45;
    let lo=0,hi=state.cues.length-1,idx=-1;
    while(lo<=hi){const mid=(lo+hi)>>1;if(state.cues[mid].start<=t){idx=mid;lo=mid+1;}else hi=mid-1;}
    let pick=-1;
    // The prefix maximum lets us stop once no earlier cue can still be active, while supporting
    // arbitrarily many short cues overlapping a long earlier cue (not just the previous three).
    if(idx>=0&&cuePrefixMaxEnd[idx]>=threshold){
      for(let k=idx;k>=0;k--){
        if(t<=state.cues[k].end+0.45){pick=k;break;}
        if(k===0||cuePrefixMaxEnd[k-1]<threshold)break;
      }
    }
    if(pick>=0){if(pick!==state.selectedCue)selectCue(pick,{scroll:true,persist:false});}
    else if(state.selectedCue!==-1){
      state.selectedCue=-1;
      document.querySelectorAll('.cue').forEach(el=>{el.classList.remove('active');el.removeAttribute('aria-current');});
      $('currentCueLabel').textContent='NO ACTIVE LINE';
    }
  }
  function importSubtitleFile(file){
    if(!file)return;
    if(file.size>15*1024*1024){setStatus('This document exceeds the 15 MB safety limit.',true);return;}
    const reader=new FileReader();
    reader.onerror=()=>setStatus('Could not read the selected file.',true);
    reader.onload=()=>{
      try{
        const raw=decodeSubtitleBuffer(reader.result);
        const hasSrtTiming=/(?:^|\n)\s*(?:\d+\s*\n)?\d{1,}:\d{2}:\d{2}[,.]\d{1,3}\s+-->\s*/m.test(raw);
        const parsed=/\.txt$/i.test(file.name)&&!hasSrtTiming?parsePlainText(raw,state.importLanguage):parseSrt(raw,state.importLanguage);
        const cues=parsed.cues,stats=parsed.stats;
        createSession(file.name,cues,parsed.language,parsed.mode);
        const details=[];
        if(parsed.language==='zh'&&stats.droppedCues)details.push(stats.droppedCues+' English/pinyin/non-Hanzi-only cue(s) skipped');
        if(stats.removedLines)details.push(stats.removedLines+' non-Hanzi line(s) removed from mixed cues');
        if(stats.modifiedMixedLines)details.push(stats.modifiedMixedLines+' mixed line(s) had Latin text removed');
        if(parsed.mode==='text'){
          setStatus('Imported '+cues.length+' text block(s)'+(storageUnavailable?' · session-only in this browser':' · saved locally')+'.');
          setNotice('Plain text is saved locally and kept without subtitle filtering or invented timestamps. This version does not generate speech. Matching audio can be played, but it cannot synchronize with untimed text.','success');
        }else{
          setStatus('Imported '+cues.length+' '+(parsed.language==='ja'?'Japanese':parsed.language==='und'?'text':'Chinese')+' subtitle(s)'+(details.length?' · '+details.join(' · '):'')+(storageUnavailable?' · session-only in this browser':' · saved locally')+'.');
          if(state.cues.length)$('transcript').scrollTop=0;
          setNotice(parsed.language==='ja'?'Japanese subtitle text was preserved without the Chinese-only filter. Word boundaries use the browser Japanese segmenter; dictionary readings and definitions are not installed yet.':parsed.language==='und'?'This text could not be identified as Chinese or Japanese. It is preserved and displayed with generic word boundaries; language-specific dictionaries and speech are disabled until you choose a language.':'Chinese-only filter applied: pinyin/English-only lines and cues are skipped, and Latin text is stripped from mixed Hanzi lines. Original timestamps are preserved. Add matching audio for synchronized playback.','success');
        }
      }catch(err){setStatus(err.message||'Text/SRT import failed.',true);}
    };
    reader.readAsArrayBuffer(file);
  }
  function basename(s){return (s||'').replace(/^.*[\\/]/,'').replace(/\.[^.]+$/,'').toLowerCase().replace(/[\s._-]+/g,'');}
  function setPitchPreservation(audio,enabled){
    for(const property of ['preservesPitch','webkitPreservesPitch','mozPreservesPitch']){
      try{if(property in audio)audio[property]=enabled;}catch{}
    }
  }
  function updateSpeedMode(text){const el=$('speedMode');if(el)el.textContent=text;}
  function updateSpeedUi(){
    const value=state.speed.toFixed(2)+'×';
    const display=$('speedValue');if(display)display.textContent=value;
    const slider=$('speedRange');if(slider)slider.value=state.speed.toFixed(2);
    const quick=$('speedBtn');if(quick)quick.classList.toggle('active',Math.abs(state.speed-.8)<.001);
  }
  function setPlaybackSpeed(value,persist=true){
    state.speed=normalizePlaybackSpeed(value);
    const audio=$('audio');
    audio.playbackRate=state.speed;
    if(soundTouchNode&&audioContext&&audioContext.state!=='closed'){
      const now=audioContext.currentTime;
      const rateParam=soundTouchNode.parameters.get('playbackRate');
      const pitchParam=soundTouchNode.parameters.get('pitch');
      if(rateParam)rateParam.setValueAtTime(state.speed,now);
      if(pitchParam)pitchParam.setValueAtTime(1,now);
    }
    updateSpeedUi();
    if(persist)setStored(STORAGE.speed,String(state.speed));
  }
  function audioWorkletProcessorUrl(){return new URL('soundtouch-processor.js',window.location.href).href;}
  function showBrowserSpeedFallback(message){
    soundTouchNode=null;
    setPitchPreservation($('audio'),true);
    audioProcessorMode='browser-fallback';
    updateSpeedMode('BROWSER FALLBACK · PITCH PRESERVED');
    if(message)setNotice(message,'');
  }
  async function ensureTimeStretchProcessor(){
    if(soundTouchNode&&audioProcessorMode==='soundtouch')return true;
    if(audioProcessorPromise)return audioProcessorPromise;
    const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextCtor||typeof window.AudioWorkletNode!=='function'){
      showBrowserSpeedFallback('This browser does not support the advanced audio processor. Using its built-in pitch-preserving playback instead.');
      return false;
    }
    audioProcessorPromise=(async()=>{
      try{
        if(!audioContext||audioContext.state==='closed')audioContext=new AudioContextCtor({latencyHint:'playback'});
        if(!audioContext.audioWorklet||typeof audioContext.audioWorklet.addModule!=='function')throw new Error('AudioWorklet is unavailable in this browser.');
        const resumePromise=audioContext.state==='suspended'?audioContext.resume():Promise.resolve();
        await audioContext.audioWorklet.addModule(audioWorkletProcessorUrl());
        await resumePromise;
        if(audioContext.state!=='running')throw new Error('The audio processing context could not start.');
        if(!mediaElementSource)mediaElementSource=audioContext.createMediaElementSource($('audio'));
        soundTouchNode=new window.AudioWorkletNode(audioContext,'soundtouch-processor',{
          numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],
          processorOptions:{sampleBufferType:'circular'}
        });
        mediaElementSource.disconnect();
        mediaElementSource.connect(soundTouchNode);
        soundTouchNode.connect(audioContext.destination);
        soundTouchNode.port.onmessage=event=>{
          const data=event.data;
          if(data&&data.type==='metrics'&&Number.isFinite(data.underrunCount)){
            audioProcessorUnderruns=Math.max(audioProcessorUnderruns,data.underrunCount);
            if(audioProcessorUnderruns>0)updateSpeedMode('TIME-STRETCH ACTIVE · BUFFER WARNING');
          }
        };
        setPitchPreservation($('audio'),false);
        audioProcessorMode='soundtouch';
        setPlaybackSpeed(state.speed,false);
        updateSpeedMode('SOUNDTOUCH · PITCH PRESERVED');
        return true;
      }catch(error){
        try{
          if(soundTouchNode)soundTouchNode.disconnect();
          if(mediaElementSource&&audioContext&&audioContext.state==='running'){
            mediaElementSource.disconnect();
            mediaElementSource.connect(audioContext.destination);
          }
        }catch{}
        showBrowserSpeedFallback('Advanced time stretching could not start on this device. Using built-in pitch-preserving playback instead.');
        return false;
      }finally{audioProcessorPromise=null;}
    })();
    return audioProcessorPromise;
  }
  function addAudioFile(file){
    if(!file)return;
    if(!file.type.startsWith('audio/')&&!/\.(mp3|m4a|aac|wav|ogg|opus|flac|mp4|webm)$/i.test(file.name)){setStatus('Choose a supported audio file (MP3, M4A, WAV, OGG, FLAC, or AAC).',true);return;}
    if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);
    state.audioUrl=URL.createObjectURL(file);state.loadedAudioName=file.name;
    const audio=$('audio');audio.pause();audio.src=state.audioUrl;audio.load();
    $('audioTitle').textContent=file.name;$('playBtn').disabled=false;$('seekInput').disabled=false;
    $('audioStatus').textContent='LOCAL AUDIO';$('audioStatusDot').style.background='var(--lime)';$('audioStatusDot').style.boxShadow='0 0 9px #c8f47c66';$('playerState').textContent='AUDIO READY';
    const session=getSession();
    if(session?.mode==='text')setNotice('Audio is loaded locally. This document has no timestamps, so playback cannot highlight, seek to, or loop a text block.','');
    else if(session&&basename(session.name)!==basename(file.name))setNotice('Audio is loaded. Its filename differs from the SRT; check that they belong together before relying on sync.','');
    else setNotice('Audio loaded locally. The subtitle timestamps will drive cue highlighting.','success');
    renderSession();updateAudioDisplay();setStatus('Audio loaded locally; no upload occurred.');
  }
  function stopAudioAndUnload(){const a=$('audio');a.pause();a.removeAttribute('src');a.load();if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);state.audioUrl=null;state.loadedAudioName='';$('playBtn').disabled=true;$('seekInput').disabled=true;$('audioTitle').textContent='No audio selected';$('audioStatus').textContent='TEXT MODE';$('audioStatusDot').style.background='#5c6b60';$('audioStatusDot').style.boxShadow='none';$('playerState').textContent='READY WHEN YOU ARE';updateAudioDisplay();}
  async function playAudio(){const a=$('audio');if(!state.audioUrl){setNotice(getSession()?.mode==='text'?'No speech engine is included in this build. Add local audio to play sound, but untimed text cannot synchronize with it.':'Add the matching audio file to listen. SRT contains text and timestamps, not sound.');return;}try{if(a.paused){await ensureTimeStretchProcessor();if(audioContext&&soundTouchNode&&audioContext.state==='suspended')await audioContext.resume();setPlaybackSpeed(state.speed,false);await a.play();$('playBtn').textContent='Ⅱ';$('playBtn').setAttribute('aria-label','Pause audio');$('playerState').textContent='PLAYING';}else{a.pause();$('playBtn').textContent='▶';$('playBtn').setAttribute('aria-label','Play audio');$('playerState').textContent='PAUSED';}}catch(e){setNotice('The audio could not start. Try another supported file format.','error');$('playerState').textContent='PLAYBACK ERROR';}}
  function updateAudioDisplay(){const a=$('audio'),cur=state.audioUrl?(a.currentTime||0):0,dur=state.audioUrl&&Number.isFinite(a.duration)?a.duration:0;$('currentTime').textContent=state.audioUrl?fmt(cur):'--:--';$('totalTime').textContent=dur?fmt(dur):(getSession()?.mode!=='text'&&state.cues.length?fmt(state.cues[state.cues.length-1].end):'--:--');const progress=dur?Math.min(100,cur/dur*100):0;$('seekFill').style.width=progress+'%';$('seekInput').value=String(Math.round(progress*10));$('seekTrack').setAttribute('aria-valuenow',String(Math.round(progress)));}
  function currentCueIndex(){if(state.selectedCue>=0)return state.selectedCue;return 0;}
  function seekTo(t){const a=$('audio');if(!state.audioUrl)return;const dur=Number.isFinite(a.duration)?a.duration:Infinity;a.currentTime=Math.max(0,Math.min(dur,t));updateAudioDisplay();syncCueToAudio();}
  function pickWord(word,cueIndex,el){document.querySelector('.tabs').hidden=['ja','und'].includes(state.language);state.selectedWord=word;state.selectedTokenEl=el||null;state.wordTab='pinyin';document.querySelectorAll('.word.selected').forEach(x=>x.classList.remove('selected'));if(el)el.classList.add('selected');$('wordTitle').textContent=word;const info=['ja','und'].includes(state.language)?null:(CEDICT.get(word)||DICT.get(word)||CHAR.get(word));$('wordSubtitle').textContent=state.language==='ja'?'Japanese · offline word segmentation':state.language==='und'?'Unclassified text · no language dictionary selected':info?`${info.pinyin||'Pinyin unavailable'} · ${info.pos||'word'}${info.source==='CC-CEDICT'?' · CC-CEDICT':''}`:(CEDICT.size===0?'Not in starter list · full dictionary not installed':'No matching entry found');$('wordKicker').textContent=state.language==='ja'?'JAPANESE · OFFLINE LOOKUP':state.language==='und'?'TEXT · NO LANGUAGE DICTIONARY':'CHINESE · OFFLINE LOOKUP';$('sheetToast').textContent='';renderWordTab();$('wordSheet').classList.add('open');$('wordSheet').setAttribute('aria-hidden','false');$('sheetBackdrop').classList.add('open');document.body.style.overflow='hidden';}
  function closeSheet(){ document.querySelector('.tabs').hidden=false;$('wordSheet').classList.remove('open');$('wordSheet').setAttribute('aria-hidden','true');$('sheetBackdrop').classList.remove('open');document.body.style.overflow='';document.querySelectorAll('.word.selected').forEach(x=>x.classList.remove('selected'));state.selectedTokenEl=null; }
