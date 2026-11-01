(function(){
  var $=function(s,r){return (r||document).querySelector(s)};

  /* mobile menu */
  var mb=$('#menuBtn'),mp=$('#mobileNav');
  if(mb&&mp){
    mb.addEventListener('click',function(){
      var o=mp.classList.toggle('open');
      mb.setAttribute('aria-expanded',o);
    });
    mp.addEventListener('click',function(e){if(e.target.tagName==='A')mp.classList.remove('open')});
  }

  /* scroll progress */
  var pb=$('#progress');
  function prog(){
    var h=document.documentElement,m=h.scrollHeight-h.clientHeight;
    if(pb&&m>0)pb.style.width=(h.scrollTop/m*100)+'%';
  }
  document.addEventListener('scroll',prog,{passive:true});prog();

  /* Jalali date and time (Tehran) */
  var ck=$('#clock');
  function tick(){
    if(!ck)return;
    try{
      var n=new Date();
      var d=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{timeZone:'Asia/Tehran',day:'numeric',month:'long',year:'numeric'}).format(n);
      var t=new Intl.DateTimeFormat('fa-IR',{timeZone:'Asia/Tehran',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(n);
      ck.textContent=d+'  ·  '+t;
    }catch(e){ck.style.display='none'}
  }
  tick();setInterval(tick,1000);

  /* water journey: the one orchestrated moment on the home page */
  var svg=$('#scene');
  if(svg&&!window.__gl){
    var trail=$('#trail',svg),drop=$('#drop',svg),labels=[].slice.call(svg.querySelectorAll('[data-at]'));
    var L=trail.getTotalLength();
    trail.style.strokeDasharray=L;
    var set=function(p){
      trail.style.strokeDashoffset=L*(1-p);
      var pt=trail.getPointAtLength(L*p);
      drop.setAttribute('cx',pt.x);drop.setAttribute('cy',pt.y);
      if(window.innerWidth<=700){
        var wrap=svg.parentNode,cw=wrap.clientWidth,W=svg.getBoundingClientRect().width||svg.clientWidth,sc=W/1200;
        var tx=Math.max(0,Math.min(W-cw,(1200-pt.x)*sc-cw/2));
        svg.style.transform='translateX('+tx+'px)';
      }
      labels.forEach(function(l){l.classList.toggle('on',p>=parseFloat(l.getAttribute('data-at')))});
    };
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){
      drop.style.display='none';set(1);
    }else{
      set(0);
      var D=7500,t0=null;
      var ease=function(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};
      var step=function(ts){
        if(t0===null)t0=ts;
        var k=Math.min((ts-t0)/D,1);set(ease(k));
        if(k<1)requestAnimationFrame(step);
      };
      setTimeout(function(){requestAnimationFrame(step)},700);
    }
  }

  /* 3D schematic tilt (answers the pointer) */
  var a3=$('#a3d'),st=$('#stage');
  if(a3&&st){
    var move=function(e){
      var p=e.touches?e.touches[0]:e,r=a3.getBoundingClientRect();
      var x=(p.clientX-r.left)/r.width-.5,y=(p.clientY-r.top)/r.height-.5;
      st.style.transform='rotateX('+(58-y*16).toFixed(1)+'deg) rotateZ('+(-32+x*40).toFixed(1)+'deg)';
    };
    a3.addEventListener('pointermove',move);
    a3.addEventListener('touchmove',move,{passive:true});
    a3.addEventListener('pointerleave',function(){st.style.transform=''});
  }

  /* visitor assistant (answers from the content of this site) */
  var norm=function(s){return s.replace(/\u064A/g,'\u06CC').replace(/\u0643/g,'\u06A9').replace(/[\u200c\u200f\u200e]/g,' ').replace(/[\u0623\u0625\u0622]/g,'\u0627').replace(/\s+/g,' ').trim().toLowerCase()};
  var KB=[
    [['سلام','درود','خوبی'],'سلام! از من می‌تونید دربارهٔ فعالیت‌های آناهیتا، اناشید یا راه تماس بپرسید.'],
    [['ممنون','مرسی','سپاس'],'خواهش می‌کنم. سوال دیگه‌ای بود در خدمتم.'],
    [['آبخیزداری','آبخوان','آب زیرزمینی','منابع آب','آب'],'در آبخیزداری و آبخوان‌داری، منابع آب را مدیریت و احیا می‌کنیم؛ از کنترل فرسایش تا تغذیهٔ مصنوعی آبخوان‌ها.'],
    [['گونه','انقراض','محیط زیست','حیات وحش'],'از گونه‌های جانوری و گیاهی در معرض انقراض و زیستگاه‌شان حفاظت و پرورش می‌کنیم.'],
    [['کشاورز','تبدیلی','تکمیلی','محصول'],'در کشاورزی، از تولید محصول خام تا صنایع تبدیلی و تکمیل زنجیرهٔ ارزش کار می‌کنیم.'],
    [['انرژی','خورشید','پاک','برق','پنل'],'در تولید انرژی خورشیدی و پاک، طرح‌های نیروگاه خورشیدی و ترکیب کشاورزی با تولید برق روی همان زمین را دنبال می‌کنیم.'],
    [['غذایی','امنیت غذا'],'برای امنیت غذایی، زنجیرهٔ ارزش غذایی را از تولید تا توزیع محصولات سالم حفظ می‌کنیم.'],
    [['گردشگر','توریسم','سفر'],'ظرفیت‌های گردشگری طبیعی و بومی منطقه را معرفی و توسعه می‌دهیم.'],
    [['اشتغال','شغل','استخدام'],'فرصت‌های شغلی پایدار ایجاد می‌کنیم و مشاغل بومی منطقه را احیا می‌کنیم.'],
    [['محروم'],'محرومیت‌زدایی یکی از محورهای اصلی ماست؛ با طرح‌هایی که مستقیم کیفیت زندگی مناطق کمتربرخوردار را بهتر می‌کنند.'],
    [['پژوهش','تحقیق','علمی'],'مطالعه و تولید داده و دانش بومی برای پشتیبانی علمی از همهٔ حوزه‌های فعالیت شرکت.'],
    [['اناشید'],'اناشید به‌زودی؛ این مگاپروژه هم‌اکنون در حال اخذ مجوزات لازم جهت احداث است و اطلاعات کامل آن منتشر می‌شود.'],
    [['اسم','چرا آناهیتا','نام شرکت'],'آناهیتا ایزدبانوی آب‌های ایران‌باستان است؛ نامی هم‌راستا با کار ما در حفاظت از آب و طبیعت.'],
    [['تماس','ایمیل','شماره','تلفن','ارتباط','آدرس','نشانی'],'تلفن: ۰۹۹۸۲۰۸۷۷۸۰ | ایمیل: info@anahita-co.ir | کرمانشاه، شهرستان کنگاور، شهرک بسیج.'],
    [['فعالیت','چیکار','چکار','خدمات'],'آبخیزداری، آبخوان‌داری، حفاظت از گونه‌های در معرض انقراض، کشاورزی، انرژی خورشیدی، امنیت غذایی، گردشگری، اشتغال‌زایی و محرومیت‌زدایی. جزئیات در صفحهٔ «خدمات» است.']
  ].map(function(r){return [r[0].map(norm),r[1]]});
  function answer(t){
    t=norm(t);
    for(var i=0;i<KB.length;i++){
      for(var j=0;j<KB[i][0].length;j++){if(t.indexOf(KB[i][0][j])>-1)return KB[i][1]}
    }
    return 'دقیق متوجه نشدم. می‌تونید دربارهٔ آبخیزداری، کشاورزی، انرژی خورشیدی، اشتغال یا اناشید بپرسید یا به info@anahita-co.ir پیام بدید.';
  }
  var fab=document.createElement('button');
  fab.className='chat-fab';fab.setAttribute('aria-label','گفتگو با دستیار آناهیتا');
  fab.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z"/></svg>';
  var box=document.createElement('div');
  box.className='chat';box.setAttribute('role','dialog');box.setAttribute('aria-label','دستیار آناهیتا');
  box.innerHTML='<header><span>دستیار آناهیتا</span><button type="button" aria-label="بستن">✕</button></header><div class="log"></div><form><input type="text" placeholder="سوالتون رو بنویسید" autocomplete="off" aria-label="سوال شما"><button type="submit">ارسال</button></form><small>پاسخ‌ها بر اساس اطلاعات همین سایت است</small>';
  document.body.appendChild(fab);document.body.appendChild(box);
  var log=$('.log',box),inp=$('input',box);
  function add(t,w){var d=document.createElement('div');d.className='msg '+w;d.textContent=t;log.appendChild(d);log.scrollTop=log.scrollHeight}
  add('سلام! از من می‌تونید دربارهٔ فعالیت‌های آناهیتا، اناشید یا راه تماس بپرسید.','bot');
  fab.addEventListener('click',function(){box.classList.toggle('open');if(box.classList.contains('open'))inp.focus()});
  $('header button',box).addEventListener('click',function(){box.classList.remove('open')});
  $('form',box).addEventListener('submit',function(e){
    e.preventDefault();var v=inp.value.trim();if(!v)return;
    add(v,'me');inp.value='';
    setTimeout(function(){add(answer(v),'bot')},350);
  });
})();
