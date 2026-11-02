const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ noServer: true, maxPayload: 4096 });
const players = new Map();
const arrows = [];
const WORLD = { w: 1000, h: 700 };
const WEAPONS = {
  bow:      { label: 'UZUN YAY', damage: 34, speed: 8.5, cooldown: 620, capacity: 12, reload: 1300 },
  crossbow: { label: 'ARB ALEST', damage: 52, speed: 11, cooldown: 1050, capacity: 5, reload: 1900 },
  knife:    { label: 'FIRLATMA BIÇAĞI', damage: 25, speed: 12, cooldown: 420, capacity: 4, reload: 1100 }
};
// Keep movement and projectile collision aligned with the visible cover in game.js.
const obstacles = [
  {x:92,y:105,w:205,h:54},{x:703,y:92,w:205,h:54},{x:110,y:536,w:190,h:58},{x:704,y:535,w:190,h:58},
  {x:390,y:105,w:220,h:48},{x:390,y:548,w:220,h:48},{x:90,y:285,w:90,h:125},{x:820,y:285,w:90,h:125},
  {x:330,y:300,w:72,h:70},{x:600,y:330,w:75,h:70}
];
let nextId = 1;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
function blocked(x,y,r=15) {
  return obstacles.some(o => x+r>o.x && x-r<o.x+o.w && y+r>o.y && y-r<o.y+o.h);
}
function spawn(id) {
  const team = id % 2 ? 'blue' : 'red';
  const spots = team === 'blue' ? [{x:220,y:240},{x:220,y:350},{x:220,y:460}] : [{x:780,y:240},{x:780,y:350},{x:780,y:460}];
  const count = [...players.values()].filter(p => p.team === team).length;
  const spot = spots[count % spots.length];
  return { id, x:spot.x, y:spot.y, hp:100, team, score:0, deaths:0, weapon:'bow', ammo:WEAPONS.bow.capacity,
    lastShot:0, reloadUntil:0, dodgeUntil:0, invulnerableUntil:Date.now()+900 };
}
function send(ws,data){ if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function snapshot(){
  const now=Date.now();
  return {type:'state',players:[...players.values()].map(p=>({id:p.id,x:p.x,y:p.y,hp:p.hp,team:p.team,score:p.score,deaths:p.deaths,weapon:p.weapon,ammo:p.ammo,maxAmmo:WEAPONS[p.weapon].capacity,reloading:now<p.reloadUntil,dodging:now<p.dodgeUntil})),
    arrows:arrows.map(a=>({x:a.x,y:a.y,vx:a.vx,vy:a.vy,team:a.team,kind:a.kind})),serverTime:now};
}
const server=http.createServer((req,res)=>{
  if(req.url==='/'||req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:true,service:'ENEMY LINES',players:players.size}));}
  res.writeHead(404);res.end('Not found');
});
server.on('upgrade',(req,socket,head)=>{if(req.url!=='/ws'){socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
wss.on('connection',ws=>{
  if(players.size>=10){send(ws,{type:'full',message:'Sunucu dolu. En fazla 10 savaşçı katılabilir.'});ws.close(1008,'Server full');return;}
  const id=nextId++,p=spawn(id);players.set(id,p);ws.playerId=id;ws.isAlive=true;
  send(ws,{type:'welcome',id,world:WORLD,weapons:Object.keys(WEAPONS)});
  ws.on('pong',()=>ws.isAlive=true);
  ws.on('message',raw=>{
    let msg;try{msg=JSON.parse(raw.toString());}catch{return;}
    const player=players.get(id);if(!player||msg.type!=='input')return;
    const now=Date.now();
    const dx=clamp(Number(msg.dx)||0,-1,1),dy=clamp(Number(msg.dy)||0,-1,1),len=Math.hypot(dx,dy)||1;
    let speed=msg.run?3.1:2.25;
    if(msg.dodge && now>player.dodgeUntil){speed=8;player.dodgeUntil=now+850;player.invulnerableUntil=now+260;}
    const nx=clamp(player.x+dx/len*speed*2,24,WORLD.w-24),ny=clamp(player.y+dy/len*speed*2,24,WORLD.h-24);
    if(!blocked(nx,player.y))player.x=nx;if(!blocked(player.x,ny))player.y=ny;
    if(['bow','crossbow','knife'].includes(msg.weapon)&&msg.weapon!==player.weapon){player.weapon=msg.weapon;player.ammo=Math.min(player.ammo,WEAPONS[player.weapon].capacity);}
    const weapon=WEAPONS[player.weapon];
    if(msg.reload && player.ammo<weapon.capacity && now>=player.reloadUntil){player.reloadUntil=now+weapon.reload;}
    if(now>=player.reloadUntil && player.ammo<weapon.capacity && player.reloadUntil!==0){player.ammo=weapon.capacity;player.reloadUntil=0;}
    if(msg.shoot && now-player.lastShot>=weapon.cooldown && now>=player.reloadUntil && player.ammo>0){
      const ax=Number(msg.aimX),ay=Number(msg.aimY),vx=ax-player.x,vy=ay-player.y,d=Math.hypot(vx,vy)||1;
      arrows.push({x:player.x,y:player.y,vx:vx/d*weapon.speed,vy:vy/d*weapon.speed,team:player.team,owner:id,damage:weapon.damage,life:95,kind:player.weapon});
      player.lastShot=now;player.ammo--;
    }
  });
  ws.on('close',()=>players.delete(id));ws.on('error',()=>players.delete(id));
});
setInterval(()=>{
  const now=Date.now();
  for(let i=arrows.length-1;i>=0;i--){const a=arrows[i];a.x+=a.vx;a.y+=a.vy;a.life--;let remove=false;
    if(blocked(a.x,a.y,3))remove=true;
    for(const p of players.values()){
      if(remove)break;if(p.id===a.owner||p.team===a.team||p.hp<=0||now<p.invulnerableUntil)continue;
      if(Math.hypot(p.x-a.x,p.y-a.y)<20){p.hp-=a.damage;remove=true;
        if(p.hp<=0){p.hp=0;const killer=players.get(a.owner);if(killer)killer.score++;p.deaths++;setTimeout(()=>{if(players.has(p.id)){const s=spawn(p.id);p.x=s.x;p.y=s.y;p.hp=100;p.invulnerableUntil=Date.now()+1400;}},1800);}break;
      }
    }
    if(remove||a.life<=0||a.x<0||a.y<0||a.x>WORLD.w||a.y>WORLD.h)arrows.splice(i,1);
  }
  const state=snapshot();for(const c of wss.clients)send(c,state);
},50);
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(ws.isAlive===false){ws.terminate();continue;}ws.isAlive=false;ws.ping();}},25000);
wss.on('close',()=>clearInterval(heartbeat));
server.listen(PORT,'0.0.0.0',()=>console.log(`ENEMY LINES server listening on ${PORT}`));
