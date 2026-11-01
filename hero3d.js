(function(){
  var cv=document.getElementById('gl');
  if(!cv)return;
  var hero=document.querySelector('.hero');
  var wrap=cv.parentNode;
  var gl=null;
  try{gl=cv.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:true})||cv.getContext('experimental-webgl')}catch(e){}
  if(!gl)return;

  /* ---------- helpers ---------- */
  function hex(h){return [parseInt(h.substr(1,2),16)/255,parseInt(h.substr(3,2),16)/255,parseInt(h.substr(5,2),16)/255]}
  var seed=7;function rnd(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}
  function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}

  var V=[];            /* interleaved: pos3 normal3 colour3 mat1 */
  var SH=[];           /* ground shadow */
  var C=[];            /* clouds, drawn with an offset */
  function tri(buf,a,b,c,col,mat,out){
    var u=sub(b,a),v=sub(c,a);
    var nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];
    var l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;nx/=l;ny/=l;nz/=l;
    if(out&&(nx*out[0]+ny*out[1]+nz*out[2])<0){nx=-nx;ny=-ny;nz=-nz}
    for(var i=0;i<3;i++){var p=i===0?a:i===1?b:c;buf.push(p[0],p[1],p[2],nx,ny,nz,col[0],col[1],col[2],mat||0)}
  }
  function quad(buf,a,b,c,d,col,mat,out){tri(buf,a,b,c,col,mat,out);tri(buf,a,c,d,col,mat,out)}
  function tint(c,k){return [c[0]*k,c[1]*k,c[2]*k]}

  function box(buf,cx,cy,cz,sx,sy,sz,col,rx,ry){
    rx=rx||0;ry=ry||0;
    var hx=sx/2,hy=sy/2,hz=sz/2,cr=Math.cos(rx),sr=Math.sin(rx),cyy=Math.cos(ry),syy=Math.sin(ry);
    function P(x,y,z){
      var y1=y*cr-z*sr,z1=y*sr+z*cr;
      var x2=x*cyy+z1*syy,z2=-x*syy+z1*cyy;
      return [cx+x2,cy+y1,cz+z2];
    }
    var p=[P(-hx,-hy,-hz),P(hx,-hy,-hz),P(hx,hy,-hz),P(-hx,hy,-hz),P(-hx,-hy,hz),P(hx,-hy,hz),P(hx,hy,hz),P(-hx,hy,hz)];
    var f=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]],ctr=[cx,cy,cz];
    for(var i=0;i<6;i++){
      var q=f[i],a=p[q[0]],b=p[q[1]],c=p[q[2]],d=p[q[3]];
      var m=[(a[0]+c[0])/2,(a[1]+c[1])/2,(a[2]+c[2])/2];
      quad(buf,a,b,c,d,col,0,sub(m,ctr));
    }
  }
  function pyramid(buf,cx,cy,cz,w,d,h,col){
    var a=[cx-w/2,cy,cz-d/2],b=[cx+w/2,cy,cz-d/2],c=[cx+w/2,cy,cz+d/2],e=[cx-w/2,cy,cz+d/2],t=[cx,cy+h,cz],ctr=[cx,cy+h/2,cz];
    [[a,b,t],[b,c,t],[c,e,t],[e,a,t]].forEach(function(f){
      var m=[(f[0][0]+f[1][0]+f[2][0])/3,(f[0][1]+f[1][1]+f[2][1])/3,(f[0][2]+f[1][2]+f[2][2])/3];
      tri(buf,f[0],f[1],f[2],col,0,sub(m,ctr));
    });
  }
  function cone(buf,cx,cy,cz,r,h,col,seg){
    seg=seg||6;var t=[cx,cy+h,cz];
    for(var i=0;i<seg;i++){
      var a0=i/seg*Math.PI*2,a1=(i+1)/seg*Math.PI*2;
      var p0=[cx+Math.cos(a0)*r,cy,cz+Math.sin(a0)*r],p1=[cx+Math.cos(a1)*r,cy,cz+Math.sin(a1)*r];
      var m=[(p0[0]+p1[0]+t[0])/3,(p0[1]+p1[1]+t[1])/3,(p0[2]+p1[2]+t[2])/3];
      tri(buf,p0,p1,t,tint(col,0.88+rnd()*0.2),0,sub(m,[cx,cy+h/2,cz]));
    }
  }
  function cyl(buf,cx,cz,r,y0,y1,col,seg){
    seg=seg||8;
    for(var i=0;i<seg;i++){
      var a0=i/seg*Math.PI*2,a1=(i+1)/seg*Math.PI*2;
      var p0=[cx+Math.cos(a0)*r,y0,cz+Math.sin(a0)*r],p1=[cx+Math.cos(a1)*r,y0,cz+Math.sin(a1)*r];
      var p2=[p1[0],y1,p1[2]],p3=[p0[0],y1,p0[2]];
      var m=[(p0[0]+p1[0])/2-cx,0,(p0[2]+p1[2])/2-cz];
      quad(buf,p0,p1,p2,p3,col,0,m);
    }
  }
  function sphere(buf,cx,cy,cz,r,col,seg,rings,mat){
    seg=seg||7;rings=rings||4;
    function P(i,j){var th=j/rings*Math.PI,ph=i/seg*Math.PI*2;return [cx+r*Math.sin(th)*Math.cos(ph),cy+r*Math.cos(th),cz+r*Math.sin(th)*Math.sin(ph)]}
    for(var j=0;j<rings;j++)for(var i=0;i<seg;i++){
      var a=P(i,j),b=P(i+1,j),c=P(i+1,j+1),d=P(i,j+1);
      var m=[(a[0]+c[0])/2,(a[1]+c[1])/2,(a[2]+c[2])/2];
      quad(buf,a,b,c,d,col,mat||0,sub(m,[cx,cy,cz]));
    }
  }

  /* ---------- the landscape ---------- */
  var XM=5.2,ZM=3.0,YB=-4.0;
  function terrain(x,z){
    var m=3.1*Math.exp(-(Math.pow(x-4.3,2)/3.2+Math.pow(z+0.6,2)/4.0));
    m+=0.45*Math.exp(-(Math.pow(x-2.9,2)/1.1+Math.pow(z+1.7,2)/1.4));
    m*=1+0.07*Math.sin(x*2.3+z*1.7)*Math.sin(z*2.9);
    return 0.03*Math.sin(x*1.3)*Math.cos(z*1.1)+m;
  }
  var strata=[
    {c:hex('#4A3524'),b:-0.55},{c:hex('#7A5A3A'),b:-1.35},{c:hex('#B08A4E'),b:-2.15},{c:hex('#CDB27C'),b:-2.95},{c:hex('#17606B'),b:YB,m:1}
  ];
  function bound(k,x,z){return k===strata.length-1?YB:strata[k].b+0.07*Math.sin(x*0.9+k*1.7)+0.05*Math.sin(z*1.3+k)}
  function groundColour(x,z,h){
    if(x>-4.7&&x<-0.3&&z>-1.8&&z<2.4){return hex(Math.floor((x+5)*1.1)%2===0?'#7DAF6B':'#93BF79')}
    if(x>0.5&&x<2.0&&z>-0.6&&z<1.7)return hex('#CDBF98');
    if(h<0.5)return hex('#6B9A6F');if(h<1.3)return hex('#5E8E78');if(h<2.1)return hex('#7C9A88');if(h<2.6)return hex('#8F9A92');
    return hex('#EEF2EE');
  }
  (function build(){
    var NX=64,NZ=40,i,j;
    function T(i,j){var x=-XM+2*XM*i/NX,z=-ZM+2*ZM*j/NZ;return [x,terrain(x,z),z]}
    for(j=0;j<NZ;j++)for(i=0;i<NX;i++){
      var a=T(i,j),b=T(i+1,j),c=T(i+1,j+1),d=T(i,j+1);
      var k1=(function(p,q,r){var h=(p[1]+q[1]+r[1])/3;return tint(groundColour((p[0]+q[0]+r[0])/3,(p[2]+q[2]+r[2])/3,h),0.94+rnd()*0.12)});
      tri(V,a,b,c,k1(a,b,c),0,[0,1,0]);tri(V,a,c,d,k1(a,c,d),0,[0,1,0]);
    }
    function wall(x0,z0,x1,z1,out,N){
      for(var s=0;s<N;s++){
        var xa=x0+(x1-x0)*s/N,za=z0+(z1-z0)*s/N,xb=x0+(x1-x0)*(s+1)/N,zb=z0+(z1-z0)*(s+1)/N;
        for(var k=0;k<strata.length;k++){
          var ta=k===0?terrain(xa,za):bound(k-1,xa,za),tb=k===0?terrain(xb,zb):bound(k-1,xb,zb);
          var ba=bound(k,xa,za),bb=bound(k,xb,zb);
          quad(V,[xa,ta,za],[xb,tb,zb],[xb,bb,zb],[xa,ba,za],strata[k].c,strata[k].m||0,out);
        }
      }
    }
    wall(-XM,ZM,XM,ZM,[0,0,1],60);wall(XM,ZM,XM,-ZM,[1,0,0],36);wall(-XM,-ZM,-XM,ZM,[-1,0,0],36);wall(XM,-ZM,-XM,-ZM,[0,0,-1],60);
    box(V,0,-4.19,0,10.9,0.38,6.7,hex('#12261E'));
    quad(SH,[-9.5,-4.42,-6.4],[9.5,-4.42,-6.4],[9.5,-4.42,6.4],[-9.5,-4.42,6.4],[0.07,0.15,0.12],3,[0,1,0]);

    /* solar field */
    var rowsZ=[-1.25,0.1,1.45],xs=[-4.15,-3.05,-1.95,-0.85];
    rowsZ.forEach(function(z){xs.forEach(function(x){
      var y=0.78;
      box(V,x,y,z,0.98,0.06,0.62,hex('#1E364C'),-0.5);
      box(V,x,y+0.034,z+0.008,0.9,0.03,0.56,hex('#3A6A94'),-0.5);
      box(V,x-0.36,y-0.4,z,0.05,0.8,0.05,hex('#0F2230'));box(V,x+0.36,y-0.4,z,0.05,0.8,0.05,hex('#0F2230'));
    })});
    /* well, pump house, pipe */
    cyl(V,-1.5,3.03,0.1,-3.75,0.12,hex('#0F1F19'),8);
    box(V,-1.5,0.3,2.7,0.5,0.46,0.44,hex('#12261E'));pyramid(V,-1.5,0.53,2.7,0.62,0.54,0.26,hex('#0B1913'));
    box(V,-2.1,0.1,2.7,1.2,0.06,0.06,hex('#12261E'));
    /* village */
    [[0.8,0.15,-0.05,1],[1.55,0.15,0.85,0.9],[1.05,0.15,1.15,0.8]].forEach(function(h){
      box(V,h[0],h[1]+0.2*h[3],h[2],0.55*h[3],0.4*h[3],0.48*h[3],hex('#E6DFCB'));
      pyramid(V,h[0],h[1]+0.4*h[3],h[2],0.7*h[3],0.62*h[3],0.3*h[3],hex('#4A3524'));
    });
    /* trees */
    for(i=0;i<22;i++){
      var tx=-4.8+rnd()*9.6,tz=-2.7+rnd()*5.4,th=terrain(tx,tz);
      if(th>1.5||(tx>-4.9&&tx<-0.2&&tz>-1.9&&tz<2.5)||(tx>0.3&&tx<2.2&&tz>-0.7&&tz<1.9))continue;
      box(V,tx,th+0.12,tz,0.06,0.24,0.06,hex('#4A3524'));
      cone(V,tx,th+0.2,tz,0.24,0.62,hex('#3F7A4F'),6);
    }
    /* clouds */
    [[-7,3.9,-2.6,0.8],[3,4.5,-3.2,0.7],[9,3.7,-1.5,0.9],[-1,4.7,-2.2,0.55]].forEach(function(c){
      sphere(C,c[0],c[1],c[2],0.9*c[3],hex('#FFFFFF'),7,4,4);sphere(C,c[0]+0.9*c[3],c[1]-0.1,c[2]+0.2,0.7*c[3],hex('#F4F8F7'),7,4,4);sphere(C,c[0]-0.85*c[3],c[1]-0.15,c[2]-0.1,0.65*c[3],hex('#F4F8F7'),7,4,4);
    });
  })();

  /* ---------- water route (runs on the front face of the cut-away) ---------- */
  var route=[];
  (function(){
    var i,n,sx=4.3,sz=-0.6;
    var ex=3.0,ez=3.05;
    n=24;for(i=0;i<=n;i++){var u=i/n,x=sx+(ex-sx)*u,z=sz+(ez-sz)*u;route.push([x,terrain(x,Math.min(z,2.95))+0.07,z])}
    var y0=terrain(ex,2.95);
    n=22;for(i=1;i<=n;i++){route.push([ex,y0+(-3.5-y0)*i/n,3.05])}
    n=30;for(i=1;i<=n;i++){var u2=i/n,x2=ex+(-1.5-ex)*u2;route.push([x2,-3.5+0.12*Math.sin(u2*6.0),3.05])}
    n=22;for(i=1;i<=n;i++){route.push([-1.5,-3.5+(0.12+3.5)*i/n,3.05])}
    n=14;for(i=1;i<=n;i++){var u3=i/n;route.push([-1.5+(-3.0+1.5)*u3,0.12+0.05*Math.sin(u3*3.14),3.0+(1.7-3.0)*u3])}
  })();
  var cum=[0];for(var ri=1;ri<route.length;ri++){var a=route[ri-1],b=route[ri];cum.push(cum[ri-1]+Math.sqrt(Math.pow(b[0]-a[0],2)+Math.pow(b[1]-a[1],2)+Math.pow(b[2]-a[2],2)))}
  var LEN=cum[cum.length-1];
  function at(s){
    s=((s%LEN)+LEN)%LEN;var lo=0,hi=cum.length-1;
    while(hi-lo>1){var mid=(lo+hi)>>1;if(cum[mid]<=s)lo=mid;else hi=mid}
    var f=(s-cum[lo])/((cum[hi]-cum[lo])||1),p=route[lo],q=route[hi];
    return [p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f,p[2]+(q[2]-p[2])*f];
  }
  var crumbs=[];for(var cs=0;cs<LEN;cs+=0.32){var cp=at(cs);crumbs.push(cp[0],cp[1],cp[2],0.07)}
  var COMETS=4,TAIL=14,SPR=COMETS*TAIL,spr=new Float32Array(SPR*4);

  /* ---------- GL programs ---------- */
  function prog(vs,fs){
    function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o}
    var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;
  }
  var pS,pP;
  try{
    pS=prog('attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;attribute float aM;uniform mat4 uVP;uniform vec3 uOff;varying vec3 vN;varying vec3 vC;varying float vM;varying vec3 vW;void main(){vec3 p=aP+uOff;vW=p;vN=aN;vC=aC;vM=aM;gl_Position=uVP*vec4(p,1.0);}',
    'precision mediump float;varying vec3 vN;varying vec3 vC;varying float vM;varying vec3 vW;uniform vec3 uL;uniform float uT;void main(){vec3 n=normalize(vN);float d=max(dot(n,uL),0.0);float hemi=0.5+0.5*n.y;vec3 col=vC*(0.4+0.3*hemi+0.62*d);float a=1.0;'+
    'if(vM>0.5&&vM<1.5){float s=0.5+0.5*sin(vW.x*2.2+sin(vW.y*6.0+uT*0.9)*1.1+uT*0.7);col+=vec3(0.06,0.22,0.22)*smoothstep(0.82,1.0,s);float s2=0.5+0.5*sin(vW.x*1.3-uT*0.5+vW.y*3.0);col+=vec3(0.03,0.1,0.1)*s2;}'+
    'else if(vM>3.5){col=vC*(0.9+0.1*d);}else if(vM>2.5){float l=length(vec2(vW.x/9.0,vW.z/6.0));a=0.34*(1.0-smoothstep(0.3,1.0,l));col=vec3(0.07,0.15,0.12);}gl_FragColor=vec4(col*a,a);}');
    pP=prog('attribute vec3 aP;attribute float aS;uniform mat4 uVP;uniform float uPx;void main(){gl_Position=uVP*vec4(aP,1.0);gl_PointSize=max(aS*uPx/gl_Position.w,1.0);}',
    'precision mediump float;uniform vec3 uCol;uniform float uAl;void main(){float d=length(gl_PointCoord-vec2(0.5));float a=smoothstep(0.5,0.04,d)*uAl;gl_FragColor=vec4(uCol*a,a);}');
  }catch(e){if(window.console)console.warn('3D disabled:',e.message);return}

  function mkbuf(arr,usage){var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,arr,usage||gl.STATIC_DRAW);return b}
  var bV=mkbuf(new Float32Array(V)),nV=V.length/10,bSh=mkbuf(new Float32Array(SH)),bC=mkbuf(new Float32Array(C)),nC=C.length/10;
  var bCr=mkbuf(new Float32Array(crumbs)),nCr=crumbs.length/4,bSp=mkbuf(spr,gl.DYNAMIC_DRAW);
  var L={p:gl.getAttribLocation(pS,'aP'),n:gl.getAttribLocation(pS,'aN'),c:gl.getAttribLocation(pS,'aC'),m:gl.getAttribLocation(pS,'aM'),
    vp:gl.getUniformLocation(pS,'uVP'),off:gl.getUniformLocation(pS,'uOff'),l:gl.getUniformLocation(pS,'uL'),t:gl.getUniformLocation(pS,'uT')};
  var Q={p:gl.getAttribLocation(pP,'aP'),s:gl.getAttribLocation(pP,'aS'),vp:gl.getUniformLocation(pP,'uVP'),px:gl.getUniformLocation(pP,'uPx'),col:gl.getUniformLocation(pP,'uCol'),al:gl.getUniformLocation(pP,'uAl')};

  /* ---------- matrices ---------- */
  function persp(f,a,n,r){var t=1/Math.tan(f/2),m=new Float32Array(16);m[0]=t/a;m[5]=t;m[10]=(r+n)/(n-r);m[11]=-1;m[14]=2*r*n/(n-r);return m}
  function look(e,c,u){
    var z=[e[0]-c[0],e[1]-c[1],e[2]-c[2]],l=Math.sqrt(z[0]*z[0]+z[1]*z[1]+z[2]*z[2]);z=[z[0]/l,z[1]/l,z[2]/l];
    var x=[u[1]*z[2]-u[2]*z[1],u[2]*z[0]-u[0]*z[2],u[0]*z[1]-u[1]*z[0]];l=Math.sqrt(x[0]*x[0]+x[1]*x[1]+x[2]*x[2]);x=[x[0]/l,x[1]/l,x[2]/l];
    var y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
    return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*e[0]+x[1]*e[1]+x[2]*e[2]),-(y[0]*e[0]+y[1]*e[1]+y[2]*e[2]),-(z[0]*e[0]+z[1]*e[1]+z[2]*e[2]),1]);
  }
  function mul(a,b){var o=new Float32Array(16);for(var c=0;c<4;c++)for(var r=0;r<4;r++){var s=0;for(var k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}

  /* ---------- labels that follow 3D points ---------- */
  var tags=[].slice.call(wrap.querySelectorAll('.tag')).map(function(el){var p=el.getAttribute('data-w').split(',').map(Number);return {el:el,p:p}});

  /* ---------- sizing, input, loop ---------- */
  var drawn=false,W=1,H=1,dpr=1,fov=32*Math.PI/180,mx=0,my=0,smx=0,smy=0,visible=true,still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    var r=wrap.getBoundingClientRect();W=Math.max(r.width,1);H=Math.max(r.height,1);
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);drawn=false;
  }
  size();window.addEventListener('resize',size);
  hero.addEventListener('pointermove',function(e){var r=hero.getBoundingClientRect();mx=(e.clientX-r.left)/r.width-.5;my=(e.clientY-r.top)/r.height-.5});
  if('IntersectionObserver' in window){new IntersectionObserver(function(en){visible=en[0].isIntersecting}).observe(hero)}

  gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  var t0=performance.now(),light=[-0.5,0.85,0.62],ll=Math.sqrt(light[0]*light[0]+light[1]*light[1]+light[2]*light[2]);light=[light[0]/ll,light[1]/ll,light[2]/ll];

  function frame(now){
    requestAnimationFrame(frame);
    if(!visible||(still&&drawn))return;
    var t=still?2.2:(now-t0)/1000;
    smx+=(mx-smx)*0.05;smy+=(my-smy)*0.05;
    var narrow=W<760,aspect=W/H;
    var az=(still?0:Math.sin(t*0.16)*0.2)+smx*0.5-(Math.min(window.scrollY/700,1))*0.25;
    var el=0.31+smy*0.14,tw=narrow?15.5:20;
    var R=Math.max(narrow?18:22,(tw/aspect)/(2*Math.tan(fov/2)));
    var target=[0,-0.9,0],eye=[target[0]+R*Math.sin(az)*Math.cos(el),target[1]+R*Math.sin(el),target[2]+R*Math.cos(az)*Math.cos(el)];
    var vp=mul(persp(fov,aspect,1,80),look(eye,target,[0,1,0]));
    var shift=narrow?0:-0.42;for(var c=0;c<4;c++)vp[c*4]+=shift*vp[c*4+3];

    gl.viewport(0,0,cv.width,cv.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

    gl.useProgram(pS);gl.uniformMatrix4fv(L.vp,false,vp);gl.uniform3fv(L.l,light);gl.uniform1f(L.t,t);
    function bindS(buf){gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.enableVertexAttribArray(L.p);gl.vertexAttribPointer(L.p,3,gl.FLOAT,false,40,0);
      gl.enableVertexAttribArray(L.n);gl.vertexAttribPointer(L.n,3,gl.FLOAT,false,40,12);
      gl.enableVertexAttribArray(L.c);gl.vertexAttribPointer(L.c,3,gl.FLOAT,false,40,24);
      gl.enableVertexAttribArray(L.m);gl.vertexAttribPointer(L.m,1,gl.FLOAT,false,40,36)}
    gl.depthMask(true);
    bindS(bV);gl.uniform3f(L.off,0,0,0);gl.drawArrays(gl.TRIANGLES,0,nV);
    bindS(bC);gl.uniform3f(L.off,((t*0.35+12)%26)-13,0,0);gl.drawArrays(gl.TRIANGLES,0,nC);
    /* soft ground shadow last, no depth write */
    gl.depthMask(false);bindS(bSh);gl.uniform3f(L.off,0,0,0);gl.drawArrays(gl.TRIANGLES,0,6);

    /* droplets */
    var speed=2.3,k=0;
    for(var cI=0;cI<COMETS;cI++){
      var head=t*speed+cI*(LEN/COMETS);
      for(var j=0;j<TAIL;j++){
        var p=at(head-j*0.2),f=1-j/TAIL;
        spr[k++]=p[0];spr[k++]=p[1];spr[k++]=p[2];spr[k++]=0.07+0.2*f*f;
      }
    }
    gl.useProgram(pP);gl.uniformMatrix4fv(Q.vp,false,vp);gl.uniform1f(Q.px,cv.height/(2*Math.tan(fov/2)));
    function bindP(buf){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(Q.p);gl.vertexAttribPointer(Q.p,3,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(Q.s);gl.vertexAttribPointer(Q.s,1,gl.FLOAT,false,16,12)}
    bindP(bCr);gl.uniform3f(Q.col,0.5,0.8,0.85);gl.uniform1f(Q.al,0.5);gl.drawArrays(gl.POINTS,0,nCr);
    gl.bindBuffer(gl.ARRAY_BUFFER,bSp);gl.bufferSubData(gl.ARRAY_BUFFER,0,spr);bindP(bSp);
    gl.uniform3f(Q.col,0.62,0.97,1.0);gl.uniform1f(Q.al,1.0);gl.drawArrays(gl.POINTS,0,SPR);

    /* labels */
    for(var ti=0;ti<tags.length;ti++){
      var q=tags[ti].p,cx=vp[0]*q[0]+vp[4]*q[1]+vp[8]*q[2]+vp[12],cy=vp[1]*q[0]+vp[5]*q[1]+vp[9]*q[2]+vp[13],cw=vp[3]*q[0]+vp[7]*q[1]+vp[11]*q[2]+vp[15];
      var sx=(cx/cw*0.5+0.5)*W,sy=(1-(cy/cw*0.5+0.5))*H;
      tags[ti].el.style.transform='translate('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px) translate(-50%,-135%)';
    }
    drawn=true;
  }
  hero.classList.add('gl-on');window.__gl=true;
  size();
  if(window.ResizeObserver){new ResizeObserver(size).observe(wrap)}
  requestAnimationFrame(frame);
})();
