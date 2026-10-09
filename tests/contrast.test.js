const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../css/style.css'),'utf8');
const colors=Object.fromEntries([...css.matchAll(/--([\w-]+):(#[\da-f]{6})(?:;|})/g)].map(m=>[m[1],m[2]]));
function luminance(hex){const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a,b){const [x,y]=[luminance(colors[a]),luminance(colors[b])].sort((a,b)=>b-a);return (x+.05)/(y+.05);}
test('normal-sized text and state symbols meet WCAG AA contrast',()=>{
 for(const [fg,bg]of [['white','correct'],['white','present'],['white','absent'],['text','key'],['muted','surface-hi'],['ink','gold'],['white','emerald']])assert(contrast(fg,bg)>=4.5,`${fg}/${bg}`);
});
test('interactive boundaries contrast with adjacent key and panel backgrounds',()=>{
 for(const bg of ['key','surface'])assert(contrast('line',bg)>=3,`border/${bg}`);
});
