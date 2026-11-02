const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let socket,myId=null,players=[],arrows=[],keys={},mouse={x:500,y:350},shoot=false,connected=false,lastFeed='';
const W=1000,H=700;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const obstacles=[
 {x:92,y:105,w:205,h:54},{x:703,y:92,w:205,h:54},{x:110,y:536,w:190,h:58},{x:704,y:535,w:190,h:58},
 {x:390,y:105,w:220,h:48},{x:390,y:548,w:220,h:48},{x:90,y:285,w:90,h:125},{x:820,y:285,w:90,h:125},
 {x:330,y:300,w:72,h:70},{x:600,y:330,w:75,h:70}
];
function connect(){
 const configured=window.ARENA_WS_URL||'';const proto=location.protocol==='https:'?'wss':'ws';const endpoint=configured.trim()||`${proto}://${location.host}/ws`;
 socket=new WebSocket(endpoint);
 socket.onopen=()=>{connected=true;$('connection').textContent='SUNUCU BAĞLANTISI AKTİF';$('dot').classList.add('ok');log('Sunucu bağlantısı kuruldu. Savaş alanına hoş geldin.');};
 socket.onerror=()=>{$('connection').textContent='SUNUCUYA ULAŞILAMIYOR';$('dot').classList.remove('ok');};
 socket.onclose=()=>{connected=false;$('connection').textContent='BAĞLANTI KESİLDİ · YENİDEN DENENİYOR';$('dot').classList.remove('ok');setTimeout(connect,3000);};
 socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.type==='welcome'){myId=m.id;$('playerTag').textContent='SAVAŞÇI #'+myId+' · '+(myId%2?'MAVİ TAKIM':'KIRMIZI TAKIM');log('Savaş alanına katıldın. Hedef: rakip takımı durdur.');}if(m.type==='state'){players=m.players||[];arrows=m.arrows||[];updateHud();}};
}
function log(t){if(t===lastFeed)return;lastFeed=t;$('feed').textContent=t;}
function updateHud(){ $('playersCount').textContent=players.length;let b=0,r=0;players.forEach(p=>p.team==='blue'?b+=p.score:r+=p.score);$('blueScore').textContent=String(b).padStart(2,'0');$('redScore').textContent=String(r).padStart(2,'0');const me=players.find(p=>p.id===myId);if(me){$('healthBar').style.width=me.hp+'%';$('healthText').textContent=me.hp+' HP';if(me.hp<40) $('healthBar').style.background='linear-gradient(90deg,#a94f42,#df8873)';else $('healthBar').style.background='linear-gradient(90deg,#6f9f68,#9bbf72)';}}
function seeded(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function pathRound(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawGround(){
 ctx.fillStyle='#48583f';ctx.fillRect(0,0,W,H);
 // grass mottling
 for(let i=0;i<520;i++){const x=seeded(i+2)*W,y=seeded(i+903)*H;ctx.fillStyle=i%3?'#65734d22':'#b0a16b16';ctx.fillRect(x,y,2+seeded(i+77)*5,1.5);}
 // stone courtyard
 pathRound(165,145,670,410,12);ctx.fillStyle='#7c7968';ctx.fill();ctx.strokeStyle='#b0a68d';ctx.lineWidth=9;ctx.stroke();
 ctx.save();ctx.clip();
 for(let y=151,row=0;y<552;y+=29,row++){for(let x=170+(row%2)*-18,col=0;x<835;x+=58,col++){const v=seeded(row*80+col+1);ctx.fillStyle=['#888474','#817e6e','#918a76','#777666'][Math.floor(v*4)];ctx.fillRect(x+1,y+1,56,27);ctx.strokeStyle='#5d6255';ctx.lineWidth=1;ctx.strokeRect(x+1,y+1,56,27);if(v>.82){ctx.strokeStyle='#aaa28a55';ctx.beginPath();ctx.moveTo(x+12,y+8);ctx.lineTo(x+28,y+6);ctx.stroke();}}}
 // worn paths and patches
 ctx.fillStyle='#a49a7d18';ctx.beginPath();ctx.ellipse(500,350,245,95,-.08,0,Math.PI*2);ctx.fill();
 ctx.restore();
 // Outer grass tufts
 for(let i=0;i<90;i++){const x=seeded(i+500)*W,y=seeded(i+700)*H;if(x>160&&x<840&&y>140&&y<560)continue;ctx.strokeStyle='#a0ad6a66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2,y-5);ctx.moveTo(x,y);ctx.lineTo(x+3,y-4);ctx.stroke();}
 drawWall(165,145,670,18);drawWall(165,537,670,18);drawWall(165,145,18,410);drawWall(817,145,18,410);
 // wall battlements
 for(let x=180;x<820;x+=42){drawBlock(x,139,23,15,'#aaa28a','#5b5b4e');drawBlock(x,531,23,15,'#aaa28a','#5b5b4e');}
 for(let y=180;y<530;y+=42){drawBlock(158,y,15,23,'#aaa28a','#5b5b4e');drawBlock(810,y,15,23,'#aaa28a','#5b5b4e');}
 // entrances / gatehouses
 drawBlock(440,135,120,42,'#635f50','#b0a68d');drawBlock(440,528,120,42,'#635f50','#b0a68d');
 // cover objects
 obstacles.forEach((o,i)=>{if(i<8){drawCrate(o.x,o.y,o.w,o.h,i%2===0?'#69583e':'#61543d');}else drawStoneCover(o.x,o.y,o.w,o.h);});
 // banners & braziers
 drawBanner(195,200,'#7095b2');drawBanner(785,485,'#b76c5e');drawTorch(340,230);drawTorch(660,470);drawTorch(340,470);drawTorch(660,230);
 // central well
 ctx.fillStyle='#242b24';ctx.beginPath();ctx.ellipse(500,350,39,29,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9a927c';ctx.beginPath();ctx.ellipse(500,345,37,25,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#303f3e';ctx.beginPath();ctx.ellipse(500,345,25,15,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c2b79a';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(500,345,36,24,0,0,Math.PI*2);ctx.stroke();
 // subtle map border
 ctx.strokeStyle='#d4c49a55';ctx.lineWidth=2;ctx.strokeRect(7,7,W-14,H-14);
}
function drawWall(x,y,w,h){ctx.fillStyle='#292d27';ctx.fillRect(x+3,y+6,w,h);ctx.fillStyle='#6b6858';ctx.fillRect(x,y,w,h);ctx.fillStyle='#aaa18a';ctx.fillRect(x,y,w,4);ctx.strokeStyle='#484c40';ctx.lineWidth=1;for(let i=0;i<w;i+=32){ctx.beginPath();ctx.moveTo(x+i,y+4);ctx.lineTo(x+i+7,y+h);ctx.stroke();}}
function drawBlock(x,y,w,h,fill,edge){ctx.fillStyle='#252a24';ctx.fillRect(x+3,y+5,w,h);ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.strokeStyle=edge;ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.fillStyle='#ffffff18';ctx.fillRect(x+3,y+2,w-6,3);}
function drawCrate(x,y,w,h,color){ctx.fillStyle='#20251e88';ctx.fillRect(x+7,y+8,w,h);ctx.fillStyle=color;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#a58a5c';ctx.lineWidth=3;ctx.strokeRect(x+2,y+2,w-4,h-4);ctx.strokeStyle='#302b22';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+5,y+5);ctx.lineTo(x+w-5,y+h-5);ctx.moveTo(x+w-5,y+5);ctx.lineTo(x+5,y+h-5);ctx.stroke();ctx.strokeStyle='#c3a475';ctx.lineWidth=1;ctx.strokeRect(x+7,y+7,w-14,h-14);}
function drawStoneCover(x,y,w,h){ctx.fillStyle='#20251e88';ctx.fillRect(x+5,y+8,w,h);pathRound(x,y,w,h,7);ctx.fillStyle='#777463';ctx.fill();ctx.strokeStyle='#b0a58a';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#5d6053';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+10,y+12);ctx.lineTo(x+w-12,y+h-10);ctx.moveTo(x+w*.5,y+4);ctx.lineTo(x+w*.45,y+h-5);ctx.stroke();}
function drawBanner(x,y,color){ctx.fillStyle='#302d25';ctx.fillRect(x,y,3,37);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+3,y+3);ctx.lineTo(x+24,y+8);ctx.lineTo(x+20,y+25);ctx.lineTo(x+3,y+22);ctx.closePath();ctx.fill();ctx.fillStyle='#d6c49c';ctx.fillRect(x+9,y+8,3,10);}
function drawTorch(x,y){ctx.fillStyle='#29251d';ctx.fillRect(x-3,y-3,6,13);ctx.fillStyle='#d88a3e';ctx.beginPath();ctx.ellipse(x,y-7,5,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe0a0';ctx.beginPath();ctx.ellipse(x,y-8,2,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d88a3e16';ctx.beginPath();ctx.arc(x,y-7,23,0,Math.PI*2);ctx.fill();}
function drawSoldier(p){
 const x=p.x,y=p.y,me=p.id===myId,team=p.team==='blue',ang=me?Math.atan2(mouse.y-y,mouse.x-x):Math.atan2(350-y,500-x);
 // ground shadow and team ring
 ctx.fillStyle='#10140f70';ctx.beginPath();ctx.ellipse(x+2,y+9,18,11,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=team?'#78b6ed':'#e18476';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y+1,17,0,Math.PI*2);ctx.stroke();
 // cloak / body shape from overhead, head points toward aim
 ctx.save();ctx.translate(x,y);ctx.rotate(ang+Math.PI/2);
 ctx.fillStyle=team?'#355f7e':'#823f37';ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(12,-7);ctx.lineTo(10,11);ctx.lineTo(0,16);ctx.lineTo(-10,11);ctx.lineTo(-12,-7);ctx.closePath();ctx.fill();ctx.strokeStyle=team?'#8ab6d5':'#d28a7e';ctx.lineWidth=1.5;ctx.stroke();
 // shoulder armor
 ctx.fillStyle='#a69c82';ctx.beginPath();ctx.ellipse(-9,-7,5,6,-.2,0,Math.PI*2);ctx.ellipse(9,-7,5,6,.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#4a4b3e';ctx.lineWidth=1;ctx.stroke();
 // leather chest strap
 ctx.strokeStyle='#c1a071';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-7,-7);ctx.lineTo(7,7);ctx.stroke();
 // head and helmet
 ctx.fillStyle='#c39a73';ctx.beginPath();ctx.arc(0,-15,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b6b5a5';ctx.beginPath();ctx.arc(0,-17,7,Math.PI,Math.PI*2);ctx.lineTo(7,-14);ctx.lineTo(-7,-14);ctx.closePath();ctx.fill();ctx.strokeStyle='#e0d9bd';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#55594f';ctx.fillRect(-1,-22,2,8);
 // bow and arrow in hands
 ctx.strokeStyle='#5b3924';ctx.lineWidth=2.7;ctx.beginPath();ctx.arc(12,-1,10,-1.1,1.1);ctx.stroke();ctx.strokeStyle='#c6b58f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(6,-10);ctx.lineTo(6,8);ctx.stroke();ctx.restore();
 // health indicator and name id
 ctx.fillStyle='#151a15';ctx.fillRect(x-15,y-29,30,4);ctx.fillStyle=p.hp>35?'#91bd76':'#d96f60';ctx.fillRect(x-14,y-28,28*clamp(p.hp,0,100)/100,2);
 ctx.font='700 8px Inter';ctx.textAlign='center';ctx.fillStyle=me?'#f0d9a6':'#e4e8dc';ctx.fillText(me?'SEN':String(p.id),x,y-34);
 if(me){ctx.strokeStyle='#e7d0a0aa';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,23,0,Math.PI*2);ctx.stroke();}
}
function drawArrow(a){const dx=a.vx||1,dy=a.vy||0;ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(dy,dx));ctx.strokeStyle='#33271c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(9,0);ctx.stroke();ctx.fillStyle='#d9d0b7';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(5,-3);ctx.lineTo(5,3);ctx.closePath();ctx.fill();ctx.strokeStyle='#b5a98d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(-13,-4);ctx.moveTo(-9,0);ctx.lineTo(-13,4);ctx.stroke();ctx.restore();}
function render(){ctx.clearRect(0,0,W,H);drawGround();[...players].sort((a,b)=>a.y-b.y).forEach(drawSoldier);arrows.forEach(drawArrow);requestAnimationFrame(render);}
function sendInput(){if(!socket||socket.readyState!==1||!myId)return;const dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);socket.send(JSON.stringify({type:'input',dx,dy,run:!!keys.shift,shoot,aimX:mouse.x,aimY:mouse.y}));shoot=false;}
function updateMouse(e){const r=canvas.getBoundingClientRect();mouse.x=clamp((e.clientX-r.left)/r.width*W,0,W);mouse.y=clamp((e.clientY-r.top)/r.height*H,0,H);}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);window.addEventListener('blur',()=>keys={});canvas.addEventListener('mousemove',updateMouse);canvas.addEventListener('mousedown',e=>{if(e.button===0)shoot=true;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
setInterval(sendInput,50);connect();render();
