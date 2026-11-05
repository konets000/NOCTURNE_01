// NOCTURNE reader source fragment; assembled in manifest order by tools/build-reader.js.
  function fmt(t){if(!Number.isFinite(t)||t<0)return '--:--';t=Math.floor(t);const h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
  function decodeEntities(s){return s.replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&nbsp;/gi,' ')}
  function cleanCueText(s){return decodeEntities(String(s).replace(/\{\\an\d+\}/g,'').replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi,'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/\\[Nn]/g,'\n').replace(/<\/?(?:i|b|u|font|ruby|rt|c|v|lang)[^>]*>/gi,'').replace(/\{[^}]*\}/g,'').trim())}
  function cleanJapaneseCueText(s){
    // Keep ruby readings as visible annotation instead of dropping their <rt> contents.
    let text=String(s).replace(/\{\\an\d+\}/g,'');
    text=text.replace(/<rt\b[^>]*>([\s\S]*?)<\/rt>/gi,'（$1）');
    return decodeEntities(text.replace(/<br\s*\/?\s*>/gi,'\n').replace(/\\[Nn]/g,'\n').replace(/<\/?(?:i|b|u|font|ruby|rt|c|v|lang|span|div)[^>]*>/gi,'').trim());
  }
  function stripLatinAnnotations(line){
    // If a subtitle line mixes Hanzi with inline pinyin/English, remove Latin-script text too.
    // Preserve Han characters, Chinese punctuation, and useful numerals; remove leftover
    // empty brackets and trailing separators left by annotations.
    return String(line)
      .replace(/\p{Script=Latin}[\p{Script=Latin}\p{M}\p{N}'’._-]*/gu,'')
      .replace(/[\(\[\{（［｛][^\p{Script=Han}]*?[\)\]\}）］｝]/gu,' ')
      .replace(/^\s*[:;,.!?—–|/\\-]+\s*/u,'')
      .replace(/\s*[-—–|/]+\s*[!?.,:;]*\s*$/u,'')
      .replace(/\s*[!?.,:;]+\s*$/u,'')
      .replace(/[ \t]+/g,' ')
      .trim();
  }
  function parseTime(s){const match=s.trim().match(/^(\d{1,}:\d{2}:\d{2})[,.](\d{1,3})$/);if(!match)return NaN;const [h,m,sec]=match[1].split(':').map(Number);if(m>59||sec>59)return NaN;return h*3600+m*60+sec+Number((match[2]+'00').slice(0,3))/1000;}
  function decodeSubtitleBuffer(buffer){const bytes=new Uint8Array(buffer);if(bytes.length>=2&&bytes[0]===0xFF&&bytes[1]===0xFE)return new TextDecoder('utf-16le').decode(bytes.subarray(2));if(bytes.length>=2&&bytes[0]===0xFE&&bytes[1]===0xFF)return new TextDecoder('utf-16be').decode(bytes.subarray(2));if(bytes.length>=3&&bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF)return new TextDecoder('utf-8').decode(bytes);try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{try{return new TextDecoder('gb18030').decode(bytes);}catch{return new TextDecoder('utf-8').decode(bytes);}}}
  function parseSrt(raw,requestedLanguage=state.importLanguage){
    // Chinese-only extraction: keep Hanzi-bearing lines and strip Latin-script annotations from them.
    // This handles (a) Hanzi, pinyin, and English on separate lines in one cue and
    // (b) pinyin/English in separate timestamped cues. Never retime retained cues.
    raw=raw.replace(/^\uFEFF/,'').replace(/\r/g,'').replace(/^WEBVTT[^\n]*\n/i,'');
    const language=window.NocturneJapaneseCore.resolveLanguage(raw,requestedLanguage);
    const blocks=raw.split(/\n\s*\n/);const cues=[];const stats={language,timedCueBlocks:0,droppedCues:0,removedLines:0,modifiedMixedLines:0,retainedHanziLines:0,retainedJapaneseLines:0};let order=0;
    for(const block of blocks){const lines=block.split('\n');let ti=lines.findIndex(l=>l.includes('-->'));if(ti<0)continue;
      const match=lines[ti].match(/([^\s]+)\s+-->\s+([^\s]+)/);if(!match)continue;
      const start=parseTime(match[1]),end=parseTime(match[2]);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
      stats.timedCueBlocks++;
      const cleaned=(language==='ja'||language==='und')?cleanJapaneseCueText(lines.slice(ti+1).join('\n')):cleanCueText(lines.slice(ti+1).join('\n'));
      const originalLines=cleaned.split('\n').map(line=>line.trim()).filter(Boolean);
      if(language==='ja'||language==='und'){
        // Japanese mode preserves the original subtitle wording and mixed-script annotations.
        // The reader must never destructively apply the Chinese-only Latin-stripping filter to Japanese.
        stats.retainedJapaneseLines+=originalLines.length;
        const text=originalLines.join('\n').trim();
        if(!text)continue;
        if(text.length>MAX_CUE_TEXT_CHARS)throw new Error(`A subtitle cue exceeds the ${MAX_CUE_TEXT_CHARS.toLocaleString()} character safety limit.`);
        cues.push({id:order++,start,end,text});
        if(cues.length>MAX_CUES_PER_SESSION)throw new Error(`This subtitle has more than ${MAX_CUES_PER_SESSION.toLocaleString()} cues and cannot be rendered safely.`);
        continue;
      }
      const hanziLines=[];
      for(const line of originalLines){
        if(!HAN.test(line))continue;
        const chineseOnly=stripLatinAnnotations(line);
        if(!HAN.test(chineseOnly))continue;
        if(chineseOnly!==line)stats.modifiedMixedLines++;
        hanziLines.push(chineseOnly);
      }
      if(!hanziLines.length){stats.droppedCues++;continue;}
      stats.removedLines+=originalLines.length-hanziLines.length;
      stats.retainedHanziLines+=hanziLines.length;
      const text=hanziLines.join('\n').trim();if(!text)continue;
      if(text.length>MAX_CUE_TEXT_CHARS)throw new Error(`A subtitle cue exceeds the ${MAX_CUE_TEXT_CHARS.toLocaleString()} character safety limit.`);
      cues.push({id:order++,start,end,text});
      if(cues.length>MAX_CUES_PER_SESSION)throw new Error(`This subtitle has more than ${MAX_CUES_PER_SESSION.toLocaleString()} cues and cannot be rendered safely.`);
    }
    cues.sort((a,b)=>a.start-b.start||a.end-b.end);cues.forEach((c,i)=>c.id=i);
    if(!cues.length){
      if(stats.timedCueBlocks>0&&language==='zh')throw new Error('No Hanzi-containing subtitle lines were found. Chinese-only mode intentionally skips English- and pinyin-only lines/cues. Choose an SRT containing Chinese characters.');
      if(stats.timedCueBlocks>0&&language==='ja')throw new Error('No subtitle text remained. Choose an SRT containing Japanese text.');
      throw new Error('No valid subtitle entries were found. Check that the file is an SRT with lines like 00:00:01,200 --> 00:00:03,000.');
    }
    return {cues,stats,language};
  }
  function isKnownWord(word){return CEDICT.has(word)||DICT.has(word)||SEGMENTATION_FREQUENCY.has(word);}
  function candidateLogProbability(word){
    const total=SEGMENTATION_TOTAL_FREQUENCY>0?SEGMENTATION_TOTAL_FREQUENCY:100000000;
    let freq=SEGMENTATION_FREQUENCY.get(word)||0;
    // CC-CEDICT and curated entries can be absent from the segmentation source.
    // Give them a modest prior instead of treating them as unknown characters.
    if(!freq){
      if(CEDICT.has(word))freq=1000;
      else if(DICT.has(word))freq=800;
      else if(CHAR.has(word)||UNIHAN_CHARACTERS.has(word))freq=80;
      else freq=1;
    }
    return Math.log(freq)-Math.log(total);
  }
  function segmentHanziRun(run,{excludeWholeWord=false}={}){
    const cps=Array.from(run);const n=cps.length;if(!n)return [];
    const best=new Array(n+1).fill(-Infinity);const next=new Array(n).fill(1);best[n]=0;
    for(let i=n-1;i>=0;i--){
      const remaining=n-i;let chosenLen=1;let chosenScore=candidateLogProbability(cps[i])+best[i+1];
      const limit=Math.min(remaining,maxDictionaryWordLength||12,12);
      for(let len=2;len<=limit;len++){
        const candidate=cps.slice(i,i+len).join('');
        if(excludeWholeWord&&i===0&&len===n)continue;
        if(!isKnownWord(candidate))continue;
        const score=candidateLogProbability(candidate)+best[i+len];
        // Deterministic tie-break: prefer a longer lexical unit only when scores are effectively equal.
        if(score>chosenScore+1e-9||(Math.abs(score-chosenScore)<=1e-9&&len>chosenLen)){
          chosenScore=score;chosenLen=len;
        }
      }
      best[i]=chosenScore;next[i]=chosenLen;
    }
    const out=[];for(let i=0;i<n;){const len=Math.max(1,next[i]||1);out.push(cps.slice(i,i+len).join(''));i+=len;}return out;
  }
  function findWordAt(text,i){
    const rest=String(text).slice(i);const match=rest.match(/^\p{Script=Han}+/u);if(!match)return Array.from(rest)[0]||'';
    return segmentHanziRun(match[0])[0]||Array.from(match[0])[0]||'';
  }
  function segmentUnclassified(text){
    const source=String(text||'');
    if(!source)return [];
    if(typeof Intl!=='undefined'&&typeof Intl.Segmenter==='function'){
      const engine=new Intl.Segmenter(undefined,{granularity:'word'});
      const tokens=[...engine.segment(source)].map(item=>({text:item.segment,word:item.isWordLike===true,analyzer:'intl-segmenter',quality:'platform-segmentation',start:item.index,end:item.index+item.segment.length}));
      if(tokens.map(token=>token.text).join('')===source)return tokens;
    }
    return [{text:source,word:false,analyzer:'unavailable',quality:'display-only',start:0,end:source.length}];
  }
  function segment(text){
    if(state.language==='ja'&&window.NocturneJapaneseCore){return window.NocturneJapaneseCore.segmentJapanese(text).map(token=>({text:token.text,word:token.word,analyzer:token.analyzer,quality:token.quality,start:token.start,end:token.end}));}
    if(state.language==='und')return segmentUnclassified(text);
    const out=[];let i=0;
    while(i<text.length){
      const cp=String.fromCodePoint(text.codePointAt(i));
      if(HAN.test(cp)){
        let j=i+cp.length;while(j<text.length){const next=String.fromCodePoint(text.codePointAt(j));if(!HAN.test(next))break;j+=next.length;}
        for(const word of segmentHanziRun(text.slice(i,j)))out.push({text:word,word:true});i=j;continue;
      }
      if(/[A-Za-z0-9]/.test(cp)){let j=i+cp.length;while(j<text.length&&/[A-Za-z0-9'’._-]/.test(text[j]))j++;out.push({text:text.slice(i,j),word:true});i=j;continue;}
      let j=i+cp.length;while(j<text.length){const next=String.fromCodePoint(text.codePointAt(j));if(HAN.test(next)||/[A-Za-z0-9]/.test(next))break;j+=next.length;}out.push({text:text.slice(i,j),word:false});i=j;
    }
    return out;
  }
