const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ noServer: true });
const players = new Map();
const arrows = [];
const WORLD = { w: 1000, h: 700 };
let nextId = 1;

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, service: "ENEMY LINES", players: players.size }));
  }
  res.writeHead(404); res.end("Not found");
});

server.on("upgrade", (req, socket, head) => {
  if (req.url !== "/ws") { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
});

function spawn(id) {
  const team = id % 2 ? "blue" : "red";
  const count = [...players.values()].filter(p => p.team === team).length;
  return { id, x: team === "blue" ? 220 : 780, y: 260 + (count % 4) * 55,
    hp: 100, team, score: 0, lastShot: 0 };
}
function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function snapshot() {
  return { type: "state",
    players: [...players.values()].map(({id,x,y,hp,team,score})=>({id,x,y,hp,team,score})),
    arrows: arrows.map(a=>({x:a.x,y:a.y,team:a.team})), serverTime: Date.now() };
}
wss.on("connection", ws => {
  const id = nextId++;
  const player = spawn(id);
  players.set(id, player);
  ws.playerId = id;
  ws.isAlive = true;
  send(ws, { type: "welcome", id, world: WORLD });

  ws.on("pong", () => { ws.isAlive = true; });
  ws.on("message", raw => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
    const p = players.get(id); if (!p) return;

    if (msg.type === "input") {
      const dx = Math.max(-1, Math.min(1, Number(msg.dx) || 0));
      const dy = Math.max(-1, Math.min(1, Number(msg.dy) || 0));
      const len = Math.hypot(dx,dy) || 1;
      const speed = msg.run ? 3.1 : 2.25;
      p.x = Math.max(35, Math.min(WORLD.w-35, p.x + dx/len*speed*2));
      p.y = Math.max(35, Math.min(WORLD.h-35, p.y + dy/len*speed*2));

      if (msg.shoot && Date.now() - p.lastShot > 650) {
        const ax = Number(msg.aimX), ay = Number(msg.aimY);
        const vx = ax - p.x, vy = ay - p.y, d = Math.hypot(vx,vy) || 1;
        arrows.push({ x:p.x, y:p.y, vx:vx/d*8, vy:vy/d*8, team:p.team, owner:id, life:90 });
        p.lastShot = Date.now();
      }
    }
  });
  ws.on("close", () => players.delete(id));
  ws.on("error", () => players.delete(id));
});

setInterval(() => {
  for (let i=arrows.length-1;i>=0;i--) {
    const a=arrows[i]; a.x+=a.vx; a.y+=a.vy; a.life--;
    let hit=false;
    for (const p of players.values()) {
      if (p.id===a.owner || p.team===a.team || p.hp<=0) continue;
      if (Math.hypot(p.x-a.x,p.y-a.y)<24) {
        p.hp-=34; hit=true;
        if (p.hp<=0) {
          const owner=players.get(a.owner); if(owner) owner.score++;
          setTimeout(()=>{ if(players.has(p.id)){const s=spawn(p.id);p.x=s.x;p.y=s.y;p.hp=100;} },1800);
        }
        break;
      }
    }
    if (hit || a.life<=0 || a.x<0 || a.y<0 || a.x>WORLD.w || a.y>WORLD.h) arrows.splice(i,1);
  }
  const state=snapshot();
  for (const c of wss.clients) send(c,state);
}, 50);

// Keep Render WebSocket sessions alive and clean up dead connections.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false; ws.ping();
  }
}, 25000);
wss.on("close", () => clearInterval(heartbeat));

server.listen(PORT, "0.0.0.0", () => console.log(`ENEMY LINES server listening on ${PORT}`));
