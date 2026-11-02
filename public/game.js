const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
let socket,myId=null,players=[],arrows=[],keys={},mouse={x:500,y:350},shoot=false,lastInput=0;
const iso=(x,y)=>({x:500+(x-y)*0.62,y:350+(x+y)*0.31});
const terrain=[{x:500,y:90,w:210,h:65},{x:190,y:360,w:120,h:75},{x:800,y:410,w:140,h:70},{x:500,y:610,w:180,h:55}];
function connect(){
 const configured = window.ARENA_WS_URL || "";
 const proto = location.protocol==="https:" ? "wss" : "ws";
 const endpoint = configured.trim() || `${proto}://${location.host}/ws`;
 socket=new WebSocket(endpoint);
 socket.onopen=()=>{ $("connection").textContent="Sunucu bağlantısı aktif";$("dot").classList.add("ok"); };
 socket.onerror=()=>{ $("connection").textContent="Sunucuya ulaşılamıyor";$("dot").classList.remove("ok"); };
 socket.onclose=()=>{ $("connection").textContent="Bağlantı kesildi — yeniden deneniyor";$("dot").classList.remove("ok");setTimeout(connect,3000); };
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==="welcome"){myId=m.id;$("playerTag").textContent="OYUNCU #"+myId+" · "+(myId%2?"MAVİ TAKIM":"KIRMIZI TAKIM");log("Savaş alanına katıldın.");}if(m.type==="state"){players=m.players;arrows=m.arrows;updateHud();}};
}
function log(t){$("feed").textContent=t;}
function updateHud(){ $("playersCount").textContent=players.length+" / 10";let b=0,r=0;players.forEach(p=>p.team==="blue"?b+=p.score:r+=p.score);$("blueScore").textContent=b;$("redScore").textContent=r;const me=players.find(p=>p.id===myId);if(me){$("healthBar").style.width=me.hp+"%";$("healthText").textContent=me.hp+" HP";}}
function polygon(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function drawGround(){
 ctx.fillStyle="#56664f";ctx.fillRect(0,0,1000,700);
 // stone courtyard diamond
 polygon([{x:500,y:70},{x:930,y:350},{x:500,y:640},{x:70,y:350}],"#777a66","#a5a18a");
 for(let y=100;y<620;y+=38)for(let x=90;x<930;x+=54){let p=iso(x,y);ctx.strokeStyle="#5e6659";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-18,p.y);ctx.lineTo(p.x+18,p.y);ctx.stroke();}
 // grass perimeter
 for(let i=0;i<75;i++){let x=(i*137)%1000,y=(i*211)%700,p=iso(x,y);ctx.fillStyle=i%2?"#788567":"#66795d";ctx.fillRect(p.x,p.y,3,2);}
 // castle walls and towers
 terrain.forEach((t,i)=>{let p=iso(t.x,t.y),w=t.w*.62,h=t.h*.62;polygon([{x:p.x-w,y:p.y},{x:p.x,y:p.y-h},{x:p.x+w,y:p.y},{x:p.x,y:p.y+h}],"#5a5144","#b4a68b");ctx.fillStyle="#877a64";ctx.fillRect(p.x-w*.7,p.y-h*.25,w*1.4,h*.5);ctx.fillStyle="#c0b092";for(let j=-2;j<=2;j++)ctx.fillRect(p.x+j*17,p.y-h*.3,8,7);});
 // decorative torches
 [[340,170],[660,520],[280,500],[730,220]].forEach(([x,y])=>{let p=iso(x,y);ctx.fillStyle="#342b22";ctx.fillRect(p.x-3,p.y-13,6,16);ctx.fillStyle="#ffb34f";ctx.beginPath();ctx.arc(p.x,p.y-17,5,0,Math.PI*2);ctx.fill();});
}
function drawPlayer(p){
 const q=iso(p.x,p.y),blue=p.team==="blue",me=p.id===myId;
 // shadow
 ctx.fillStyle="#17201888";ctx.beginPath();ctx.ellipse(q.x,q.y+7,15,7,0,0,Math.PI*2);ctx.fill();
 // body / cloak
 ctx.fillStyle=blue?"#416e9b":"#9a4e43";ctx.beginPath();ctx.moveTo(q.x-10,q.y-18);ctx.lineTo(q.x+10,q.y-18);ctx.lineTo(q.x+13,q.y+3);ctx.lineTo(q.x,q.y+10);ctx.lineTo(q.x-13,q.y+3);ctx.fill();
 // head and helmet
 ctx.fillStyle="#c69b72";ctx.beginPath();ctx.arc(q.x,q.y-25,8,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#b9b7a4";ctx.beginPath();ctx.arc(q.x,q.y-29,8,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(q.x-8,q.y-29,16,4);
 // bow
 ctx.strokeStyle="#4b3020";ctx.lineWidth=3;ctx.beginPath();ctx.arc(q.x+12,q.y-8,10,-1.2,1.2);ctx.stroke();
 // hp
 ctx.fillStyle="#252b25";ctx.fillRect(q.x-15,q.y-43,30,4);ctx.fillStyle=p.hp>35?"#79c17b":"#d66c5c";ctx.fillRect(q.x-15,q.y-43,30*p.hp/100,4);
 if(me){ctx.strokeStyle="#f4d28c";ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y-15,19,0,Math.PI*2);ctx.stroke();}
}
function render(){
 drawGround();
 // sort by world y for simple depth ordering
 [...players].sort((a,b)=>a.x+a.y-(b.x+b.y)).forEach(drawPlayer);
 arrows.forEach(a=>{const p=iso(a.x,a.y);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-Math.PI/4);ctx.strokeStyle="#2c2118";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(8,0);ctx.stroke();ctx.fillStyle="#d6d0b5";ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(3,-3);ctx.lineTo(3,3);ctx.fill();ctx.restore();});
 requestAnimationFrame(render);
}
function sendInput(){
 if(!socket||socket.readyState!==1||!myId)return;
 const dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
 const dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 const me=players.find(p=>p.id===myId);if(!me)return;
 const x=me.x,y=me.y;
 // Convert screen mouse position to approximate world direction
 const mx=(mouse.x-500)/.62,my=(mouse.y-350)/.31;
 const aimX=x+(mx+my)/2,aimY=y+(my-mx)/2;
 socket.send(JSON.stringify({type:"input",dx,dy,run:!!keys.shift,shoot,aimX,aimY}));shoot=false;
}
window.addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase()))e.preventDefault();});
window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener("mousemove",e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*1000;mouse.y=(e.clientY-r.top)/r.height*700;});
canvas.addEventListener("mousedown",e=>{if(e.button===0)shoot=true;});
setInterval(sendInput,50);connect();render();