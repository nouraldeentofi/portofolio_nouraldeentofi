/* Living marble ("ebru") background.
   Her LinkedIn banner is white marble; here the marble moves on its own:
   two invisible combs wander across the page and swirl the veins, and every
   few seconds a blush or peach ink drop blooms and is carried off by the flow.
   It needs no mouse or clicks. Time comes from the clock, so the motion stays
   smooth even when a frame is dropped. Without WebGL the CSS marble remains. */
(function () {
  var doc = document.documentElement;
  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var cv = document.createElement("canvas");
  cv.id = "ebru";
  cv.setAttribute("aria-hidden", "true");
  var gl = null;
  try {
    gl = cv.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power", desynchronized: true });
  } catch (e) {}
  if (!gl) return;
  document.body.insertBefore(cv, document.body.firstChild);

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec2 R;uniform float T;",
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float h1(float x){return fract(sin(x*91.17)*43758.5453);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);",
    " return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);",
    " for(int i=0;i<4;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}",
    "vec2 swirl(vec2 uv,vec2 c,float s){vec2 d=uv-c;float a=s*exp(-dot(d,d)*7.);float cs=cos(a),sn=sin(a);return c+mat2(cs,-sn,sn,cs)*d;}",
    "void main(){",
    " vec2 uv=gl_FragCoord.xy/R.y; float asp=R.x/R.y; float t=T;",
    // two combs wander on slow Lissajous paths and stir the marble by themselves
    " vec2 c1=vec2(asp*(.5+.38*sin(t*.071)),.5+.33*sin(t*.093+1.3));",
    " vec2 c2=vec2(asp*(.5+.40*cos(t*.053+2.)),.5+.30*cos(t*.081));",
    " uv=swirl(uv,c1,1.7*sin(t*.12));",
    " uv=swirl(uv,c2,-1.4*cos(t*.097+.7));",
    " vec2 p=uv*1.3; float ft=t*.05;",
    " vec2 q=vec2(fbm(p+vec2(0.,ft)),fbm(p+vec2(5.2,1.3)-ft));",
    " float f=fbm(p+3.4*q+vec2(1.7,9.2)+ft*.6);",
    " float v1=1.-smoothstep(0.,.05,abs(sin((p.x*1.1+p.y*.55+f*5.2)*3.1416)));",
    " float v2=1.-smoothstep(0.,.075,abs(sin((-p.x*.7+p.y*1.1+q.x*4.)*4.08)));",
    " vec3 base=vec3(.965,.961,.953); vec3 grey=vec3(.37,.36,.39);",
    " vec3 peach=vec3(.976,.80,.66); vec3 blush=vec3(.957,.866,.851);",
    " vec3 col=mix(base,blush,smoothstep(.45,.85,q.y)*.62);",
    " col=mix(col,grey,v1*(.075+.09*smoothstep(.3,.7,q.x)));",
    " col=mix(col,peach,v2*smoothstep(.55,.75,f)*.2);",
    // ink drops bloom on their own, one after another
    " for(int i=0;i<3;i++){",
    "  float fi=float(i); float per=12.; float tt=t+fi*per/3.;",
    "  float k=floor(tt/per); float age=mod(tt,per);",
    "  vec2 dp=vec2(asp*(.1+.8*h1(k*3.1+fi*7.)),.12+.76*h1(k*5.7+fi*13.));",
    "  vec2 dd=uv-dp+(q-.5)*.09*min(age,4.);",
    "  float L=length(dd); float rad=.03+.078*sqrt(age);",
    "  float fill=1.-smoothstep(rad-.026,rad,L);",
    "  float ring=smoothstep(rad-.025,rad-.009,L)*(1.-smoothstep(rad-.004,rad+.005,L));",
    "  float fade=smoothstep(0.,.9,age)*(1.-smoothstep(5.5,per,age));",
    "  vec3 dc=mod(k+fi,2.)<1.?peach:blush;",
    "  col=mix(col,dc,(fill*.1+ring*.22)*fade);",
    " }",
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { cv.remove(); return; }
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.remove(); return; }
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, "R"), uT = gl.getUniformLocation(pr, "T");
  doc.classList.add("has-ebru");

  // fixed, modest resolution: the marble is soft by nature, and a steady size never flickers
  var phone = innerWidth < 700, k = phone ? 0.38 : 0.45, W = 0, H = 0, lastW = 0, lastH = 0;
  function size(force) {
    var w = innerWidth, h = innerHeight;
    // phones change height when the address bar slides; ignore small changes
    if (!force && w === lastW && Math.abs(h - lastH) < 140) return false;
    lastW = w; lastH = h;
    W = Math.max(1, Math.round(w * k)); H = Math.max(1, Math.round(h * k));
    cv.width = W; cv.height = H; gl.viewport(0, 0, W, H);
    return true;
  }
  size(true);

  var t0 = performance.now(), offset = 20 + Math.random() * 60, running = !reduce, flip = false;
  function draw(now) {
    gl.uniform2f(uR, W, H);
    gl.uniform1f(uT, offset + (now - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    // phones: a steady 30 fps; everything else: every frame
    if (phone) { flip = !flip; if (flip) return; }
    draw(now);
  }

  if (reduce) draw(performance.now());
  else {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) running = false;
      else if (!running) { running = true; requestAnimationFrame(loop); }
    });
    requestAnimationFrame(loop);
  }
  var rz;
  addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () { if (size(false)) draw(performance.now()); }, 150);
  });
})();
