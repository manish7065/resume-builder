'use strict';

// Version 2: sections contain independently editable blocks and grouped subsections.
const DRAFT_KEY = 'coforge-resume-v2';
const $ = selector => document.querySelector(selector);
const node = (tag, className='', text) => {
  const result = document.createElement(tag);
  result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
};
const uid = () => crypto.randomUUID();
const settingsDefaults = () => ({fontSize:10, lineHeight:1.65, sectionGap:6, labelWidth:23, logo:true});
const block = (kind, label='', text='', extra={}) => ({id:uid(),kind,label,text,align:'inherit',...extra});
const makeSection = (title, items=[], extra={}) => ({id:uid(),title,kind:'standard',align:'left',headingAlign:'left',pageBreak:false,showTitle:true,items,...extra});
const imageBlock = (extra={}) => block('image','Image','',{src:'',width:70,height:50,fit:'contain',position:'center',...extra});
const projectBlock = (p={}) => block('group',p.client||'New project','',{subtitle:p.duration||'',items:[
  block('row','Team Size',p.team||''),block('row','Technologies',p.technologies||''),
  block('row','Role',p.role||''),block('row','Project Overview',p.overview||''),
  block('bullets','Roles & Responsibilities',p.responsibilities||'',{table:true})
]});

function migrate(legacy) {
  if (!legacy || typeof legacy.name!=='string' || !Array.isArray(legacy.skills) || !Array.isArray(legacy.projects)) throw Error('This is not a resume draft.');
  const labels=['Technologies/\nFrameworks','Domain/Industry','Build Tools','Internet Technologies','Databases','Version Control'];
  return {version:2,settings:settingsDefaults(),sections:[
    makeSection('Personal details',[
      block('name','Name',legacy.name),
      ...Object.entries({designation:'Designation',email:'E-mail',phone:'Mob. No',experience:'Experience',location:'Location'}).map(([key,label])=>block('contact',label,legacy[key]||'')),
      imageBlock({label:'Passport photo',src:legacy.photo||'',width:45,height:48,fit:'cover',position:'right',passport:true})
    ],{kind:'profile',showTitle:false}),
    makeSection('Professional Summary',[block('text','',legacy.summary||'',{bold:true})]),
    makeSection('Technical Summary',labels.map((label,i)=>block('row',label,legacy.skills[i]||'',{accent:i>=4}))),
    makeSection('Client / Project Details',legacy.projects.map(projectBlock),{pageBreak:true}),
    makeSection('Educational Qualifications',[block('bullets','',legacy.education||'')])
  ]};
}
const presets = {
  'Personal details':()=>migrate(emptyResume()).sections[0],
  'Professional summary':()=>makeSection('Professional Summary',[block('text','','',{bold:true})]),
  'Technical summary':()=>migrate(emptyResume()).sections[2],
  'Projects':()=>makeSection('Client / Project Details',[projectBlock()]),
  'Work experience':()=>makeSection('Work Experience',[block('group','Job title','',{subtitle:'Company · Dates',items:[block('bullets','Responsibilities','')]})]),
  'Education':()=>makeSection('Educational Qualifications',[block('group','Degree / qualification','',{subtitle:'Institution · Year',items:[block('text','','')]})]),
  'Certifications':()=>makeSection('Certifications',[block('row','Certification','')]),
  'Languages':()=>makeSection('Languages',[block('row','Language','Proficiency')]),
  'Image / portfolio':()=>makeSection('Portfolio',[imageBlock()]),
  'Custom section':()=>makeSection('Custom Section',[block('text','','')])
};

const alignments=['left','center','right','justify'];
const kinds=['name','contact','text','row','bullets','image','group'];
function validate(raw) {
  if (!raw || typeof raw!=='object') throw Error('Invalid draft');
  if (raw.version!==2) raw=migrate(raw);
  const str=(v,max=50000)=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid or oversized text');return v;};
  const choice=(v,options,fallback)=>options.includes(v)?v:fallback;
  const number=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
  let count=0;
  const readItems=(items,depth=0)=>{
    if(!Array.isArray(items)||items.length>200||depth>2)throw Error('Too many blocks or subsection levels');
    return items.map(b=>{
      if(!b||!kinds.includes(b.kind)||++count>600)throw Error('Invalid block or too many blocks');
      const result=block(b.kind,str(b.label??'',160),str(b.text??''),{align:choice(b.align,['inherit',...alignments],'inherit'),bold:b.bold===true,accent:b.accent===true,table:b.table===true});
      if(b.kind==='group'){result.subtitle=str(b.subtitle??'',200);result.items=readItems(b.items,depth+1);}
      if(b.kind==='image'){
        const src=str(b.src??'',2500000);
        if(src&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src))throw Error('Invalid image. Use uploaded JPG, PNG or WebP images.');
        Object.assign(result,{src,width:number(b.width,15,170,70),height:number(b.height,15,180,50),fit:choice(b.fit,['contain','cover'],'contain'),position:choice(b.position,['left','center','right'],'center'),passport:b.passport===true});
      }
      return result;
    });
  };
  if(!Array.isArray(raw.sections)||raw.sections.length>40)throw Error('Maximum 40 sections');
  const s=raw.settings||{};
  return {version:2,settings:{fontSize:number(s.fontSize,8,13,10),lineHeight:number(s.lineHeight,1.2,2.2,1.65),sectionGap:number(s.sectionGap,2,14,6),labelWidth:number(s.labelWidth,18,42,23),logo:s.logo!==false},sections:raw.sections.map(s=>makeSection(str(s.title,160),readItems(s.items),{kind:s.kind==='profile'?'profile':'standard',align:choice(s.align,alignments,'left'),headingAlign:choice(s.headingAlign,alignments,'left'),pageBreak:s.pageBreak===true,showTitle:s.showTitle!==false}))};
}

let resume=migrate(example), timer, toastTimer, history=[], openSections=new Set(), openBlocks=new Set();
try {
  const stored=localStorage.getItem(DRAFT_KEY), legacy=localStorage.getItem(STORAGE_KEY);
  if(stored||legacy)resume=validate(JSON.parse(stored||legacy));
} catch(error) {setTimeout(()=>toast('Could not load saved draft: '+error.message),0);}
if(resume.sections[0])openSections.add(resume.sections[0].id);

function toast(message) {$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',5000);}
function save() {try{localStorage.setItem(DRAFT_KEY,JSON.stringify(resume));$('#save-status').textContent='Saved on this device';}catch{$('#save-status').textContent='Storage full or unavailable — export your draft';}}
function changed() {save();clearTimeout(timer);timer=setTimeout(renderResume,120);}
function checkpoint() {history.push(structuredClone(resume));if(history.length>12)history.shift();$('#undo').disabled=false;}
function mutate(action) {checkpoint();action();save();renderForm();renderResume();}
function blockCount(items=resume.sections.flatMap(s=>s.items)) {return items.reduce((sum,b)=>sum+1+(b.kind==='group'?blockCount(b.items):0),0);}
function button(text,action,cls='') {const b=node('button',cls,text);b.type='button';b.onclick=action;return b;}
function field(label,value,onChange,{multiline=false,max=50000}={}) {
  const wrap=node('label','field');wrap.append(node('span','',label));const input=node(multiline?'textarea':'input');input.value=value;input.maxLength=max;input.addEventListener('change',()=>{});
  input.addEventListener('input',()=>onChange(input.value));wrap.append(input);return wrap;
}
function select(label,value,options,onChange) {
  const wrap=node('label','field');wrap.append(node('span','',label));const input=node('select');input.setAttribute('aria-label',label);
  for(const option of options){const [v,t]=Array.isArray(option)?option:[option,option[0].toUpperCase()+option.slice(1)];const o=node('option','',t);o.value=v;input.append(o);}
  input.value=value;input.onchange=()=>onChange(input.value);wrap.append(input);return wrap;
}
function toggle(label,value,onChange) {const wrap=node('label','toggle-field'),input=node('input');input.type='checkbox';input.checked=value;input.onchange=()=>onChange(input.checked);wrap.append(input,node('span','',label));return wrap;}
function range(label,value,min,max,step,onChange) {
  const wrap=node('label','field');const title=node('span','',`${label}: ${value}`),input=node('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;input.setAttribute('aria-label',label);input.oninput=()=>{title.textContent=`${label}: ${input.value}`;onChange(Number(input.value));};wrap.append(title,input);return wrap;
}
function orderControls(list,index,label) {
  const controls=node('div','order-controls');
  for(const [text,delta] of [['↑',-1],['↓',1]]){const b=button(text,()=>mutate(()=>{[list[index],list[index+delta]]=[list[index+delta],list[index]];}));b.disabled=index+delta<0||index+delta>=list.length;b.setAttribute('aria-label',`Move ${label} ${delta<0?'up':'down'}`);controls.append(b);}
  controls.append(button('Remove',()=>{mutate(()=>list.splice(index,1));toast('Removed. Use Undo to restore it.');},'danger-button'));return controls;
}
function makeDisclosure(id,title,set,cls) {
  const details=node('details',cls);details.dataset.id=id;details.open=set.has(id);const summary=node('summary');const titleNode=node('span','disclosure-title',title);summary.append(titleNode);details.append(summary);details.ontoggle=()=>{if(!details.isConnected)return;if(details.open)set.add(id);else set.delete(id);};return {details,titleNode};
}

function renderForm() {
  const form=$('#resume-form');form.replaceChildren();
  if(!resume.sections.length)form.append(node('p','empty-message','Your resume is empty. Add a section to get started.'));
  resume.sections.forEach((section,index)=>{
    const {details,titleNode}=makeDisclosure(section.id,section.title||'Untitled section',openSections,'section-editor');
    const step=node('span','step',String(index+1).padStart(2,'0'));details.firstChild.prepend(step);
    const body=node('div','section-fields');body.append(orderControls(resume.sections,index,`section ${section.title}`));
    body.append(field('Section title',section.title,v=>{section.title=v;titleNode.textContent=v||'Untitled section';changed();},{max:160}));
    const controls=node('div','field-grid');controls.append(select('Text alignment',section.align,alignments,v=>{section.align=v;changed();}),select('Heading alignment',section.headingAlign,alignments,v=>{section.headingAlign=v;changed();}));body.append(controls);
    body.append(toggle('Show section heading',section.showTitle,v=>{section.showTitle=v;changed();}),toggle('Start on a new page',section.pageBreak,v=>{section.pageBreak=v;changed();}));
    if(section.kind==='profile')body.append(node('p','hint','The first passport image sits beside your details. Move it left or right using Image position. Other images flow with the content.'));
    renderItems(body,section.items,0);
    details.append(body);form.append(details);
  });
  $('#undo').disabled=history.length===0;
}
function renderItems(container,items,depth) {
  items.forEach((item,index)=>{
    const {details,titleNode}=makeDisclosure(item.id,item.label||({text:'Text',bullets:'Bullet list',image:'Image',group:'Subsection'}[item.kind]||'Field'),openBlocks,'block-editor');
    details.dataset.kind=item.kind;
    const body=node('div','block-fields');body.append(orderControls(items,index,`block ${item.label||index+1}`));
    body.append(field(item.kind==='group'?'Subsection title':item.kind==='image'?'Image caption / description':'Label / heading',item.label,v=>{item.label=v;titleNode.textContent=v||'Untitled '+item.kind;changed();},{max:160}));
    if(item.kind==='image')renderImageEditor(body,item);
    else {
      body.append(select('Block alignment',item.align,['inherit',...alignments],v=>{item.align=v;changed();}));
      if(item.kind==='group'){
        body.append(field('Subtitle / duration',item.subtitle,v=>{item.subtitle=v;changed();},{max:200}));
        renderItems(body,item.items,depth+1);
      } else {
        body.append(field(item.kind==='bullets'?'Bullet points (one per line)':'Content',item.text,v=>{item.text=v;changed();},{multiline:true}));
        if(item.kind==='text')body.append(toggle('Bold text',item.bold,v=>{item.bold=v;changed();}));
        if(item.kind==='row'||item.kind==='bullets')body.append(toggle('Orange text',item.accent,v=>{item.accent=v;changed();}));
        if(item.kind==='bullets')body.append(toggle('Display in a table row',item.table,v=>{item.table=v;changed();}));
      }
    }
    details.append(body);container.append(details);
  });
  const add=node('div','block-adder');let selected='text';const options=[['text','Text paragraph'],['row','Table row'],['bullets','Bullet list'],['contact','Personal detail'],['name','Name / headline'],['image','Image']];if(depth<2)options.push(['group','Subsection'],['project','Project subsection']);
  add.append(select('Content to add',selected,options,v=>selected=v),button('+ Add content',()=>{
    if(items.length>=200)return toast('Maximum 200 blocks in this group.');
    if(blockCount()+(selected==='project'?6:1)>600)return toast('Maximum 600 content blocks per draft.');
    mutate(()=>{const b=selected==='image'?imageBlock():selected==='project'?projectBlock():selected==='group'?block('group','New subsection','',{subtitle:'',items:[]}):block(selected,selected==='row'?'New field':'','');items.push(b);openBlocks.add(b.id);});
  },'add-button'));container.append(add);
}
function renderImageEditor(body,item) {
  if(item.src){const thumb=node('img','upload-preview');thumb.src=item.src;thumb.alt=item.label||'Uploaded image';body.append(thumb);}
  const wrap=node('label','field');wrap.append(node('span','',item.src?'Replace image':'Upload image'));const input=node('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.onchange=()=>uploadImage(input,item);wrap.append(input);body.append(wrap,node('p','hint','JPG, PNG or WebP · up to 5 MB. Images are stored in your local draft.'));
  body.append(select('Image position',item.position,['left','center','right'],v=>{item.position=v;changed();}),select('Image fit',item.fit,[['contain','Fit whole image'],['cover','Crop to fill']],v=>{item.fit=v;changed();}));
  body.append(range('Image width (mm)',item.width,15,item.passport?65:170,1,v=>{item.width=v;changed();}),range('Image height (mm)',item.height,15,item.passport?75:180,1,v=>{item.height=v;changed();}));
  if(item.src)body.append(button('Clear image',()=>mutate(()=>item.src='')));
}
async function uploadImage(input,item) {
  const file=input.files[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){input.value='';return toast('Choose a JPG, PNG or WebP image under 5 MB.');}
  input.disabled=true;
  try{
    const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');const ratio=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const src=canvas.toDataURL('image/jpeg',.86);
    mutate(()=>item.src=src);toast('Image added. Adjust size, fit and position below.');
  }catch{toast('Could not open this image. Please choose another.');}finally{input.disabled=false;input.value='';}
}
function renderDesign() {
  const panel=$('#design-panel');panel.replaceChildren(node('h2','panel-title','Layout & alignment'),node('p','hint','Keep the Coforge look and fine-tune the spacing. Individual sections and blocks have their own alignment controls under Content.'));
  for(const [key,label,min,max,step] of [['fontSize','Body font size (pt)',8,13,.5],['lineHeight','Line spacing',1.2,2.2,.05],['sectionGap','Space above sections (mm)',2,14,1],['labelWidth','Table label width (%)',18,42,1]])panel.append(range(label,resume.settings[key],min,max,step,v=>{resume.settings[key]=v;changed();}));
  panel.append(toggle('Show Coforge wordmark on pages',resume.settings.logo,v=>{resume.settings.logo=v;changed();}));
  panel.append(button('Reset layout defaults',()=>{mutate(()=>resume.settings=settingsDefaults());renderDesign();}));
}

function imageNode(item,compact=false) {
  const figure=node('figure','resume-image'+(item.passport?' passport-image':''));figure.style.width=`${Math.min(item.width,compact?65:170)}mm`;figure.style.maxWidth='100%';figure.style.marginLeft=item.position==='left'?'0':'auto';figure.style.marginRight=item.position==='right'?'0':'auto';
  const frame=node('div','image-frame');frame.style.height=`${Math.min(item.height,compact?75:180)}mm`;
  if(item.src){const img=node('img');img.src=item.src;img.alt=item.label||'Resume image';img.style.objectFit=item.fit;frame.append(img);}else frame.append(node('span','image-placeholder',item.passport?'Passport photograph':'Add an image'));
  figure.append(frame);if(item.label&&!item.passport)figure.append(node('figcaption','',item.label));return figure;
}

function renderResume() {
  clearTimeout(timer);const pages=$('#pages');pages.replaceChildren();let content,pageNumber=0;
  const settings=resume.settings;
  function newPage(){
    const shell=node('div','page-shell'),page=node('article','resume-page');page.setAttribute('aria-label',`Resume page ${++pageNumber}`);
    page.style.setProperty('--body-size',settings.fontSize+'pt');page.style.setProperty('--line-space',settings.lineHeight);page.style.setProperty('--section-gap',settings.sectionGap+'mm');page.style.setProperty('--label-width',settings.labelWidth+'%');
    if(settings.logo){const logo=node('div','resume-logo');logo.append(node('span','orange','Co'),document.createTextNode('forge'));page.append(logo);}
    content=node('div','page-content');page.append(content,node('footer','page-footer',`${pageNumber} | Page`));shell.append(page);pages.append(shell);
  }
  const fits=()=>content.scrollHeight<=content.clientHeight+1;
  function appendFixed(element){content.append(element);if(!fits()&&content.childElementCount>1){element.remove();newPage();content.append(element);}}
  // Split exactly by characters, preferring word boundaries. All content is retained.
  function appendText(factory,value){
    let remaining=value||'';
    do{
      const whole=factory(remaining);content.append(whole);if(fits())return;whole.remove();
      let low=0,high=remaining.length;
      while(low<high){const middle=Math.ceil((low+high)/2),candidate=factory(remaining.slice(0,middle));content.append(candidate);const fit=fits();candidate.remove();if(fit)low=middle;else high=middle-1;}
      if(low===0){if(content.childElementCount){newPage();continue;}throw Error('A block cannot fit on an empty page. Reduce its label or image size.');}
      let cut=low;const space=remaining.lastIndexOf(' ',low-1);if(space>low*.6)cut=space+1;
      // Never split a UTF-16 surrogate pair across pages.
      if(cut<remaining.length&&/[\uD800-\uDBFF]/.test(remaining[cut-1]))cut--;
      content.append(factory(remaining.slice(0,cut)));remaining=remaining.slice(cut);if(remaining)newPage();
    }while(remaining);
  }
  function withHeading(heading,probe){
    if(!heading)return;
    content.append(heading);if(probe)content.append(probe);const fit=fits();if(probe)probe.remove();
    if(!fit){heading.remove();if(content.childElementCount)newPage();content.append(heading);}
  }
  function textNode(item,text,alignment){
    let result;
    if(item.kind==='row'||(item.kind==='bullets'&&item.table)){
      const continuation=item.kind==='bullets'&&content.lastElementChild?.dataset.blockId===item.id;
      result=node('div','table-row'+(item.kind==='bullets'?' table-bullet':'')+(continuation?' bullet-continuation':''));result.append(node('div','table-label',continuation?'':item.label));const value=node('div','table-value'+(item.accent?' accent':''));
      if(item.kind==='bullets'){const b=node('div','bullet');b.append(node('span','',text));value.append(b);}else value.textContent=text;
      result.append(value);
    }else{
      result=node('div',item.kind==='name'?'profile-name':item.kind==='contact'?'profile-detail':item.kind==='bullets'?'plain-bullet':'resume-text');
      if(item.kind==='name'||item.kind==='contact')result.textContent=(item.label?item.label+': ':'')+text;
      else if(item.kind==='bullets'){result.append(node('span','bullet-marker','•'),node('span','',text));}
      else result.textContent=text;
    }
    result.style.textAlign=alignment;result.dataset.blockId=item.id;if(item.bold)result.style.fontWeight='700';return result;
  }
  function firstProbe(items,alignment){
    const item=items[0];if(!item)return null;
    if(item.kind==='image')return imageNode(item);
    if(item.kind==='group')return node('div','subsection-heading',item.label);
    return textNode(item,(item.text||' ').slice(0,120),alignment);
  }
  function renderItems(items,parentAlign){
    for(const item of items){
      const align=item.align==='inherit'?parentAlign:item.align;
      if(item.kind==='group'){
        const h=node('div','subsection-heading');h.style.textAlign=align;h.dataset.blockId=item.id;h.append(node('strong','',item.label));if(item.subtitle)h.append(node('span','',item.subtitle));
        withHeading(h,firstProbe(item.items,align));renderItems(item.items,align);
      }else if(item.kind==='image')appendFixed(imageNode(item));
      else {
        if(item.label&&['text','bullets'].includes(item.kind)&&!item.table){const label=node('h3','block-heading',item.label);label.style.textAlign=align;withHeading(label,textNode(item,item.text.slice(0,120),align));}
        const texts=item.kind==='bullets'?item.text.split('\n').filter(t=>t.trim()):[item.text];
        for(const text of texts)appendText(t=>textNode(item,t,align),text);
      }
    }
  }
  function renderProfile(section){
    const photo=section.items.find(b=>b.kind==='image'&&b.passport);
    // The standard profile groups contact details and photo; additional blocks remain freely ordered.
    const flowItems=section.items.filter(b=>b!==photo);
    const firstExtra=flowItems.findIndex(b=>!['name','contact'].includes(b.kind));
    const basics=firstExtra===-1?flowItems:flowItems.slice(0,firstExtra);
    const profile=node('div','profile flexible-profile');profile.style.textAlign=section.align;
    const identity=node('div','profile-identity');basics.forEach(b=>identity.append(textNode(b,b.text,b.align==='inherit'?section.align:b.align)));
    if(photo&&photo.position!=='center'){
      profile.style.gridTemplateColumns=photo.position==='left'?`${Math.min(photo.width,65)}mm minmax(0,1fr)`:`minmax(0,1fr) ${Math.min(photo.width,65)}mm`;
      if(photo.position==='left')profile.append(imageNode(photo,true),identity);else profile.append(identity,imageNode(photo,true));
    }else{profile.style.gridTemplateColumns='1fr';if(photo)profile.append(imageNode(photo,true));profile.append(identity);}
    content.append(profile);
    if(!fits()){
      profile.remove();if(content.childElementCount)newPage();content.append(profile);
      if(!fits()){profile.remove();if(photo)appendFixed(imageNode(photo,true));renderItems(basics,section.align);}
    }
    renderItems(flowItems.slice(basics.length),section.align);
  }
  newPage();
  for(const section of resume.sections){
    if(section.pageBreak&&content.childElementCount)newPage();
    if(section.showTitle&&section.title){const heading=node('h2','resume-heading',section.title);heading.style.textAlign=section.headingAlign;heading.dataset.sectionId=section.id;withHeading(heading,firstProbe(section.items,section.align));}
    if(section.kind==='profile')renderProfile(section);else renderItems(section.items,section.align);
  }
  $('#page-count').textContent=`${pageNumber} ${pageNumber===1?'page':'pages'}`;scalePreview();
}
function scalePreview(){const pane=$('.preview-pane'),style=getComputedStyle(pane),available=pane.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);document.querySelectorAll('.page-shell').forEach(shell=>{const page=shell.firstElementChild,scale=Math.min(1,available/page.offsetWidth);page.style.transform=`scale(${scale})`;shell.style.width=page.offsetWidth*scale+'px';shell.style.height=page.offsetHeight*scale+'px';});}
function filename(){for(const s of resume.sections){const name=s.items.find(b=>b.kind==='name');if(name?.text)return name.text.replace(/[^a-z0-9_-]/gi,'_').slice(0,80);}return 'Resume';}
function switchPanel(name){for(const key of ['content','design']){$('#'+key+'-panel').hidden=key!==name;$('#'+key+'-tab').setAttribute('aria-selected',String(key===name));}if(name==='design')renderDesign();}
$('#content-tab').onclick=()=>switchPanel('content');$('#design-tab').onclick=()=>switchPanel('design');
document.querySelectorAll('[role=tab]').forEach(tab=>tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const name=tab.id==='content-tab'?'design':'content';switchPanel(name);$('#'+name+'-tab').focus();}});
$('#resume-form').onsubmit=e=>e.preventDefault();
$('#add-section').onclick=()=>$('#section-dialog').showModal();
for(const [label,factory] of Object.entries(presets))$('#section-options').append(button(label,()=>{if(resume.sections.length>=40)return toast('Maximum 40 sections.');const section=factory();if(blockCount()+blockCount(section.items)>600)return toast('Maximum 600 content blocks per draft.');mutate(()=>{resume.sections.push(section);openSections.add(section.id);section.items.forEach(b=>openBlocks.add(b.id));});$('#section-dialog').close();const last=$('#resume-form').lastElementChild;last.scrollIntoView({behavior:'smooth',block:'start'});}));
$('#undo').onclick=()=>{if(!history.length)return;resume=history.pop();save();renderForm();renderDesign();renderResume();toast('Previous structure restored.');};
$('#download').onclick=()=>$('#export-dialog').showModal();
$('#print-now').onclick=async()=>{$('#export-dialog').close();await document.fonts.ready;renderResume();await Promise.all([...document.querySelectorAll('#pages img')].map(img=>img.decode().catch(()=>{})));const title=document.title;document.title=filename()+' - Resume';window.print();document.title=title;};
window.addEventListener('beforeprint',renderResume);
$('#export-data').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(resume,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download=filename()+'-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import-data').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('Draft must be smaller than 20 MB');const imported=validate(JSON.parse(await file.text()));if(confirm('Replace your current draft? You can Undo this change.'))mutate(()=>{resume=imported;openSections=new Set(resume.sections.slice(0,1).map(s=>s.id));});}catch(error){toast('Could not import: '+error.message);}finally{e.target.value='';}};
$('#reset').onclick=()=>{if(confirm('Start a blank resume? You can Undo this change.'))mutate(()=>{resume={version:2,settings:settingsDefaults(),sections:[]};});};
window.addEventListener('resize',scalePreview);
renderForm();renderDesign();renderResume();
