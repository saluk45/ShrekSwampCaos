  /* =========================
     Base do motor de jogo
     - Canvas render loop
     - Entidades simples: players, inimigos
     - Troca de personagem
     - Barra de corrupção
     - Sistema básico de mapas/estágio
     ========================= */

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // ----- Dados dos personagens (placeholders estilizados) -----
  const characters = [
    { id: 'shrek',  name: 'Shrek',   role:'Tanque',   color:'#84cc16', maxHp:200, hp:200, corruption:0, spriteColor:'#3b7a3b' },
    { id: 'freeza', name: 'Freeza',  role:'Ofensivo',color:'#f43f5e', maxHp:140, hp:140, corruption:0, spriteColor:'#f87171' },
    { id: 'lula',   name: 'Lula',    role:'Controle', color:'#60a5fa', maxHp:120, hp:120, corruption:0, spriteColor:'#3b82f6' },
    { id: 'choque', name: 'Super',   role:'Agilidade',color:'#f59e0b', maxHp:130, hp:130, corruption:0, spriteColor:'#fbbf24' },
    { id: 'bmo',    name: 'BMO',     role:'Suporte',  color:'#a78bfa', maxHp:100, hp:100, corruption:0, spriteColor:'#7c3aed' }
  ];

  let currentIndex = 0; // personagem ativo

  // ----- Estado global -----
  const state = {
    running: true,
    keys:{} ,
    enemies: [],
    time:0,
    mapIndex: 0,
    logs:[],
    corruptionLimit:100
  };

  // ----- Utils -----
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function rand(min,max){return Math.random()*(max-min)+min}
  function log(msg){state.logs.unshift('['+new Date().toLocaleTimeString()+'] '+msg); if(state.logs.length>100) state.logs.pop(); renderSidebar();}

  // ----- Sidebar rendering -----
  function renderSidebar(){
    const list = document.getElementById('char-list'); list.innerHTML='';
    characters.forEach((c,i)=>{
      const div = document.createElement('div'); div.className='char';
      div.innerHTML = `<img src="data:image/svg+xml;utf8,${encodeURIComponent(genCharSVG(c))}" alt="${c.name}"/>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;font-size:13px"><strong>${c.name}</strong><span>${c.role}</span></div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <div style="flex:1"><div class="meter"><i style="width:${(c.hp/c.maxHp*100||0)}%"></i></div></div>
            <div style="width:60px;text-align:right;font-size:12px">HP ${Math.round(c.hp)}/${c.maxHp}</div>
          </div>
          <div style="margin-top:6px;font-size:12px">Corr: ${Math.round(c.corruption)}/${state.corruptionLimit}</div>
        </div>`;
      if(i===currentIndex) div.style.outline='2px solid rgba(99,102,241,0.7)';
      list.appendChild(div);
    });

    document.getElementById('status').innerHTML = `Mapa: ${maps[state.mapIndex].name} — Inimigos: ${state.enemies.length}`;

    const logEl = document.getElementById('log'); logEl.innerHTML = state.logs.slice(0,40).map(l=>`<div>${l}</div>`).join('');
  }

  function genCharSVG(c){
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>
      <rect width='100%' height='100%' fill='${c.spriteColor}' rx='12'/>
      <text x='50%' y='55%' font-size='20' text-anchor='middle' fill='white' font-family='Arial' font-weight='700'>${c.name[0]}</text>
    </svg>`;
    return svg;
  }

  // ----- Map definitions -----
  const maps = [
    { name:'Tão Tão Distante (Corrompido)', bounds:{w:2000,h:1200}, spawnRate:2 },
    { name:'Fenda Sombria', bounds:{w:1600,h:1000}, spawnRate:1.2 },
    { name:'Planície dos Ecos', bounds:{w:2200,h:1400}, spawnRate:2.5 }
  ];

  // ----- Entities -----
  class Entity{
    constructor(x,y,w,h,color){this.x=x;this.y=y;this.vx=0;this.vy=0;this.w=w;this.h=h;this.color=color;this.hp=50}
    draw(ctx,cam){ctx.fillStyle=this.color;ctx.fillRect(this.x-cam.x,this.y-cam.y,this.w,this.h)}
  }

  class PlayerEntity extends Entity{
    constructor(char){super(200,200,48,64,char.spriteColor);this.char=char;this.speed=180;this.attackCooldown=0}
    update(dt){
      // input
      const k = state.keys;
      let dx=0,dy=0;
      if(k['KeyA']) dx-=1; if(k['KeyD']) dx+=1; if(k['KeyW']) dy-=1; if(k['KeyS']) dy+=1;
      const len = Math.hypot(dx,dy)||1; dx/=len; dy/=len;
      this.vx = dx*this.speed; this.vy = dy*this.speed;
      this.x += this.vx*dt; this.y += this.vy*dt;
      this.attackCooldown = Math.max(0,this.attackCooldown-dt);
    }
    attack(){
      if(this.attackCooldown>0) return;
      this.attackCooldown=0.4;
      // create small frontal hit that damages enemies
      const hit = new Entity(this.x+this.w+6,this.y+10,22,22,'rgba(255,255,255,0.9)');
      hit.damage = 30;
      state.enemies.forEach(e=>{ if(collide(hit,e)) { e.hp -= hit.damage; log(this.char.name+ ' atingiu um inimigo! HP inimigo: '+Math.round(e.hp)); }});
      // using attack increases corruption slightly
      this.char.corruption = clamp(this.char.corruption + 2,0,state.corruptionLimit);
    }
    useSkill(){
      // skill effects vary by char id
      const id = this.char.id;
      if(id==='shrek'){ log('Shrek realiza um ataque sísmico!'); state.enemies.forEach(e=>e.hp-=18); this.char.corruption+=6 }
      if(id==='freeza'){ log('Freeza dispara rajada intensa!'); state.enemies.forEach(e=>e.hp-=30); this.char.corruption+=8 }
      if(id==='lula'){ log('Lula toca melodia: confusão!'); state.enemies.forEach((e,i)=>{ e.vx += rand(-80,80); e.vy += rand(-60,60)}); this.char.corruption+=7 }
      if(id==='choque'){ log('Super Choque ativa escudo elétrico!'); this.char.hp = clamp(this.char.hp + 40,0,this.char.maxHp); this.char.corruption+=5 }
      if(id==='bmo'){ log('BMO repara memórias e cura!'); this.char.hp = clamp(this.char.hp + 60,0,this.char.maxHp); characters.forEach(c=>c.corruption = clamp(c.corruption - 8,0,state.corruptionLimit)); }
    }
    draw(ctx,cam){
      // simplified sprite: rounded rect + eye
      ctx.fillStyle=this.char.spriteColor; roundRect(ctx,this.x-cam.x,this.y-cam.y,this.w,this.h,8,true,false);
      ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(this.x+8-cam.x,this.y+14-cam.y,12,10);
    }
  }

  function roundRect(ctx,x,y,w,h,r,fill,stroke){ if(fill) ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); if(fill) ctx.fill(); if(stroke) ctx.stroke(); }

  function collide(a,b){return a.x<a.x+a.w && b.x<b.x+b.w && a.y<a.y+a.h && b.y<b.y+b.h && (a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y)}

  // ----- Enemy spawner -----
  function spawnEnemy(){
    const map = maps[state.mapIndex];
    const x = rand(100, map.bounds.w-200);
    const y = rand(100, map.bounds.h-200);
    const e = new Entity(x,y,36,48,'#d946ef'); e.hp = 60; e.vx = rand(-40,40); e.vy = rand(-30,30);
    state.enemies.push(e);
  }

  // ----- Camera -----
  const camera = {x:0,y:0,w:W,h:H};

  // ----- Create player instance -----
  let player = new PlayerEntity(characters[currentIndex]);
  player.x = 400; player.y = 300;

  // ----- Input handlers -----
  window.addEventListener('keydown', e=>{
    state.keys[e.code] = true;
    if(e.code.startsWith('Digit')){
      const idx = parseInt(e.code.replace('Digit',''))-1; if(characters[idx]) switchCharacter(idx);
    }
    if(e.code==='KeyJ'){ player.attack(); }
    if(e.code==='KeyK'){ player.useSkill(); }
    if(e.code==='Escape'){ state.running = !state.running; log(state.running? 'Jogo retomado':'Jogo pausado'); }
  });
  window.addEventListener('keyup', e=>{ state.keys[e.code] = false });

  // ----- Switch character -----
  function switchCharacter(idx){
    if(idx===currentIndex) return; // already
    // persist position and some stats
    log('Trocando para '+characters[idx].name);
    currentIndex = idx;
    player = new PlayerEntity(characters[currentIndex]);
    player.x = clamp(player.x,100, maps[state.mapIndex].bounds.w-100);
    player.y = clamp(player.y,100, maps[state.mapIndex].bounds.h-100);
    renderSidebar();
  }

  // ----- Game loop -----
  let last = 0; let spawnTimer = 0;
  function loop(ts){
    if(!last) last = ts; const dt = Math.min(0.05,(ts-last)/1000); last = ts;
    if(state.running){
      update(dt);
      draw();
    }
    requestAnimationFrame(loop);
  }

  function update(dt){
    state.time += dt;
    player.update(dt);
    // basic enemy physics
    for(let i=state.enemies.length-1;i>=0;i--){
      const e = state.enemies[i]; e.x += e.vx*dt; e.y += e.vy*dt; // simple wander
      // check death
      if(e.hp<=0){ state.enemies.splice(i,1); log('Inimigo derrotado'); }
    }

    // spawn logic
    spawnTimer += dt;
    if(spawnTimer > (2 / maps[state.mapIndex].spawnRate)){
      spawnTimer = 0; spawnEnemy();
    }

    // camera follow
    camera.x = clamp(player.x - W/2, 0, maps[state.mapIndex].bounds.w - W);
    camera.y = clamp(player.y - H/2, 0, maps[state.mapIndex].bounds.h - H);

    // corruption passive effect: if corruption high, gradual penalties
    characters.forEach(c=>{
      if(c.corruption > 60){ c.hp = clamp(c.hp - 6*dt,0,c.maxHp); }
      if(c.corruption > 90){ /* risk of being erased - placeholder */ }
    });

    // remove players with 0 hp? just log for now
    characters.forEach(c=>{ if(c.hp<=0) log(c.name + ' está incapacitado!'); });

    renderSidebar();
  }

  function draw(){
    // clear
    ctx.clearRect(0,0,W,H);

    // background parallax
    drawBackground();

    // draw grid for map extents
    drawMapBounds();

    // draw enemies
    state.enemies.forEach(e=>{ e.draw(ctx,camera); drawEntityHp(e,ctx,camera); });

    // draw player
    player.draw(ctx,camera);
    drawPlayerHp(player,ctx,camera);

    // UI overlay: corruption meter big
    drawGlobalUI();
  }

  function drawBackground(){
    // subtle noise bands to give feel of corruption
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'rgba(10,8,20,0.6)'); g.addColorStop(1,'rgba(6,8,20,1)'); ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    // purple mist overlay depending on average corruption
    const avgCor = characters.reduce((s,c)=>s+c.corruption,0)/characters.length / state.corruptionLimit;
    if(avgCor>0.02){ ctx.fillStyle = 'rgba(120,35,160,'+ (avgCor*0.18) +')'; ctx.fillRect(0,0,W,H); }
  }

  function drawMapBounds(){
    // draw simple tiled ground to show scroll
    const tile = 64;
    ctx.save(); ctx.translate(-camera.x%tile,-camera.y%tile);
    for(let x=-tile;x<W+tile;x+=tile){ for(let y=-tile;y<H+tile;y+=tile){ ctx.strokeStyle='rgba(255,255,255,0.02)'; ctx.strokeRect(x,y,tile,tile); }}
    ctx.restore();
  }

  function drawEntityHp(e,ctx,cam){
    const pct = clamp(e.hp/60,0,1);
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(e.x-cam.x, e.y-cam.y-8, e.w,6);
    ctx.fillStyle='rgba(255,80,80,0.9)'; ctx.fillRect(e.x-cam.x, e.y-cam.y-8, e.w*pct,6);
  }

  function drawPlayerHp(p,ctx,cam){
    const c = p.char;
    // HP
    const pct = clamp(c.hp/c.maxHp,0,1);
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(14,14,240,18);
    ctx.fillStyle='rgba(50,120,255,0.9)'; ctx.fillRect(14,14,240*pct,18);
    ctx.fillStyle='white'; ctx.font='14px Inter,Arial'; ctx.fillText(`${c.name} — HP ${Math.round(c.hp)}/${c.maxHp}`,20,27);
    // corruption
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(14,40,240,12);
    const cpct = clamp(c.corruption/state.corruptionLimit,0,1);
    ctx.fillStyle='rgba(139,92,246,0.9)'; ctx.fillRect(14,40,240*cpct,12);
    ctx.fillStyle='white'; ctx.font='12px Inter,Arial'; ctx.fillText(`Corrupção ${Math.round(c.corruption)}/${state.corruptionLimit}`,20,50);
  }

  function drawGlobalUI(){
    // mini-map placeholder
    ctx.save(); ctx.globalAlpha=0.9; ctx.fillStyle='rgba(8,10,15,0.7)'; ctx.fillRect(W-180,14,166,86);
    ctx.fillStyle='white'; ctx.font='12px Inter,Arial'; ctx.fillText('Mini-mapa', W-168,32);
    // list nearby enemies
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='11px Inter,Arial'; ctx.fillText('Inimigos próximos: '+state.enemies.length, W-168,52);
    ctx.restore();
  }

  // ----- Initial population -----
  for(let i=0;i<3;i++) spawnEnemy();
  log('Protótipo iniciado. Escolha personagens com 1-5. Use J para atacar, K para habilidade.');
  renderSidebar();

  requestAnimationFrame(loop);