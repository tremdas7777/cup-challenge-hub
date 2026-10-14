// @ts-nocheck
import { CONFIG as C } from './config';

let mounted = false;

export function mountQuiz() {
  if (mounted) return;
  mounted = true;
  const $ = id => document.getElementById(id);
  const store = {
    get(k){ try{ return JSON.parse(localStorage.getItem("qr_"+k)); }catch{ return null; } },
    set(k,v){ try{ localStorage.setItem("qr_"+k, JSON.stringify(v)); }catch{} }
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

  /* ---------- marca / setup ---------- */
  document.documentElement.style.setProperty("--verde", C.corVerde);
  document.documentElement.style.setProperty("--dest", C.corDestaque);
  document.title = "Quiz Premiado · " + C.loja;
  const brandHTML = C.logo ? `<img src="${esc(C.logo)}" alt="${esc(C.loja)}">` : `<span class="nome">${esc(C.loja)}</span>`;
  document.querySelectorAll(".brand").forEach(e => e.innerHTML = brandHTML);
  document.querySelector(".brand-splash").innerHTML = C.logo ? `<img src="${esc(C.logo)}" alt="">` : `<span class="nome">${esc(C.loja)}</span>`;
  document.querySelector(".brand-load").innerHTML = C.logo ? `<img class="lg" src="${esc(C.logo)}" alt="">` : `<div class="lgname">${esc(C.loja)}</div>`;
  document.querySelectorAll(".lojaNome").forEach(e => e.textContent = C.loja);
  if (C.imagemHero) $("hero").style.backgroundImage = `url("${C.imagemHero}")`;
  $("hTitulo").textContent = C.titulo;
  $("hSub").innerHTML = C.subtitulo;

  // rodapé
  (() => {
    const c = C.contato, e = C.empresa;
    let h = `<div class="blk">${brandHTML.replace('class="nome"','class="nome" style="font-size:1.2rem;font-weight:900"')}</div>`;
    if (c.email || c.whatsapp || c.cidade) h += `<div class="blk"><h4>Contato</h4>${c.email?`<p>✉️ ${esc(c.email)}</p>`:""}${c.whatsapp?`<p>📱 ${esc(c.whatsapp)}</p>`:""}${c.cidade?`<p>📍 ${esc(c.cidade)}</p>`:""}</div>`;
    if (e.razaoSocial || e.cnpj) h += `<div class="blk"><h4>Informações legais</h4>${e.razaoSocial?`<p><b>Empresa:</b> ${esc(e.razaoSocial)}</p>`:""}${e.cnpj?`<p><b>CNPJ:</b> ${esc(e.cnpj)}</p>`:""}</div>`;
    h += `<div class="bot">© ${new Date().getFullYear()} ${esc(C.loja)}. Todos os direitos reservados.<br>${esc(C.regras)}</div>`;
    $("foot").innerHTML = h;
  })();

  // UTMs
  const utm = {};
  new URLSearchParams(location.search).forEach((v,k) => { if (/^(utm_|fbclid|gclid|ttclid)/.test(k)) utm[k] = v; });
  if (Object.keys(utm).length) store.set("utm", utm);

  // Meta Pixel (opcional)
  if (C.metaPixelId){
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', C.metaPixelId); fbq('track','PageView');
  }
  const track = (ev, data) => { if (window.fbq) fbq(ev === "Lead" ? "track" : "trackCustom", ev, data || {}); };

  /* ---------- sons (mesmos do projeto original) ---------- */
  let ac;
  function tone(f, d, type="sine", vol=.3){
    try{
      ac = ac || new (window.AudioContext||window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, ac.currentTime);
      g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(.01, ac.currentTime + d);
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
    }catch{}
  }
  const sCorrect = () => { tone(523,.15,"sine",.25); setTimeout(()=>tone(659,.15,"sine",.25),100); setTimeout(()=>tone(784,.3,"sine",.3),200); };
  const sWrong   = () => { tone(300,.2,"square",.15); setTimeout(()=>tone(250,.35,"square",.15),150); };
  const sReveal  = () => { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.25,"sine",.2),i*120)); setTimeout(()=>tone(1047,.6,"triangle",.3),500); };
  const sScratch = () => tone(180 + Math.random()*120, .03, "sawtooth", .03);

  /* ---------- navegação ---------- */
  function show(id){
    document.querySelectorAll(".view").forEach(v => { if (v.id !== "v-splash") v.classList.remove("on"); });
    $("v-"+id).classList.add("on");
    scrollTo(0,0);
  }
  function floaties(set, n){
    for (let i=0;i<n;i++){
      const d = document.createElement("div");
      d.className = "floaty"; d.textContent = set[Math.floor(Math.random()*set.length)];
      d.style.left = Math.random()*100 + "vw";
      d.style.animationDelay = Math.random()*.5 + "s";
      d.style.animationDuration = 2 + Math.random() + "s";
      document.body.appendChild(d); setTimeout(() => d.remove(), 3800);
    }
  }

  /* ---------- splash ---------- */
  setTimeout(() => {
    const sp = $("v-splash"); sp.style.opacity = 0;
    setTimeout(() => { sp.classList.remove("on"); }, 400);
    if (store.get("premio") && store.get("expira")) showResult();
    else show("home");
  }, 900);

  /* ---------- quiz ---------- */
  let qi = 0, acertos = 0; const respostas = [];
  function go(){ tone(1,.01); track("QuizStart"); show("quiz"); renderQ(); }
  function renderQ(){
    const q = C.perguntas[qi], n = C.perguntas.length;
    $("qCount").textContent = `Pergunta ${qi+1} de ${n}`;
    $("qScore").textContent = `✓ ${acertos} acerto${acertos===1?"":"s"}`;
    $("qBadge").textContent = "⚡ " + (qi < n*.5 ? "Fácil" : qi < n*.85 ? "Médio" : "Difícil");
    $("qText").textContent = q.p;
    $("qFeed").innerHTML = "";
    $("qDots").innerHTML = C.perguntas.map((_,i) => `<i class="${i===qi?"cur":i<qi?"done":""}"></i>`).join("");
    $("qOpts").innerHTML = "";
    q.r.forEach((r, idx) => {
      const b = document.createElement("button");
      b.className = "opt"; b.textContent = r;
      b.onclick = () => answer(idx);
      $("qOpts").appendChild(b);
    });
  }
  function answer(idx){
    const q = C.perguntas[qi], ok = idx === q.certa;
    const btns = [...document.querySelectorAll("#qOpts .opt")];
    btns.forEach((b,i) => { b.disabled = true; b.classList.add(i===idx ? (ok?"ok":"bad") : i===q.certa ? "ok" : "dim"); });
    if (ok){ acertos++; sCorrect(); } else sWrong();
    respostas.push({ pergunta: q.p, resposta: q.r[idx], acertou: ok });
    $("qFeed").innerHTML = `<div class="feedback ${ok?"ok":"bad"}">${ok ? "✓ Correto! Mandou bem!" : "✗ Quase! A certa está em verde."}</div>`;
    setTimeout(() => {
      qi++;
      if (qi < C.perguntas.length) renderQ();
      else { track("QuizComplete", { acertos }); startLoading(); }
    }, 1400);
  }

  /* ---------- verificando ---------- */
  function startLoading(){
    show("load");
    $("loadA").classList.remove("hidden"); $("loadB").classList.add("hidden");
    let p = 0;
    const t = setInterval(() => {
      p += 2;
      $("pFill").style.width = p + "%";
      $("pFill").textContent = p > 20 ? p + "%" : "";
      $("pTxt").textContent = p < 33 ? "Processando..." : p < 66 ? "Validando respostas..." : "Finalizando...";
      if (p >= 100){
        clearInterval(t);
        setTimeout(() => {
          $("loadA").classList.add("hidden"); $("loadB").classList.remove("hidden");
          $("chancesTxt").textContent = `Você acertou ${acertos} de ${C.perguntas.length} · ${C.rodadas} chances de ganhar!`;
          floaties(["🎉","🎊","⭐","🏆"], 30); sReveal();
        }, 500);
      }
    }, 50);
  }
  function afterApproved(){
    if (C.pedirLead) show("lead");
    else startScratch();
  }

  /* ---------- lead ---------- */
  const whats = $("whats");
  whats.addEventListener("input", () => {
    let d = whats.value.replace(/\D/g,"").slice(0,11);
    whats.value = d.length > 6 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` : d.length > 2 ? `(${d.slice(0,2)}) ${d.slice(2)}` : d;
  });
  $("leadForm").addEventListener("submit", e => {
    e.preventDefault();
    const nome = $("nome").value.trim(), tel = whats.value.replace(/\D/g,"");
    if (nome.length < 2) return $("err").textContent = "Digite seu nome.";
    if (tel.length < 10) return $("err").textContent = "Digite um WhatsApp válido com DDD.";
    if (!$("lgpd").checked) return $("err").textContent = "Marque a caixa de consentimento para continuar.";
    $("err").textContent = "";
    store.set("lead", { nome, tel });
    startScratch();
  });

  /* ---------- raspadinha ---------- */
  let round = 0, premio = null;
  function sortear(){
    const total = C.premios.reduce((s,p) => s + p.peso, 0);
    let r = Math.random() * total;
    for (const p of C.premios){ if ((r -= p.peso) < 0) return p; }
    return C.premios[0];
  }
  const allItems = () => [...C.premios, ...C.simbolos];
  const shuffle = a => { for (let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
  function fillGrid(grid, pool){
    const counts = {}; grid.forEach(g => counts[g.id] = (counts[g.id]||0) + 1);
    let guard = 0;
    while (grid.length < 9 && guard++ < 200){
      const it = pool[Math.floor(Math.random()*pool.length)];
      if ((counts[it.id]||0) < 2){ grid.push(it); counts[it.id] = (counts[it.id]||0) + 1; }
    }
    return shuffle(grid);
  }
  const losingGrid  = () => fillGrid([], allItems());
  const winningGrid = w  => fillGrid([w,w,w], allItems().filter(i => i.id !== w.id));

  function startScratch(){
    premio = store.get("premio") || sortear();
    store.set("premio", { id:premio.id, nome:premio.nome, emoji:premio.emoji, codigo:premio.codigo });
    const lead = store.get("lead") || {};
    if (C.webhookLeads) fetch(C.webhookLeads, { method:"POST", headers:{ "Content-Type":"application/json" }, keepalive:true,
      body: JSON.stringify({ nome:lead.nome||"", whatsapp:lead.tel||"", premio:premio.nome, cupom:premio.codigo, acertos, respostas, utm:store.get("utm")||{}, data:new Date().toISOString(), loja:C.loja }) }).catch(()=>{});
    track("Lead", { content_name: premio.nome });
    round = 0; show("scratch"); renderRound();
  }
  function renderRound(){
    const R = C.rodadas, last = round === R - 1;
    let h = "";
    for (let i=0;i<R;i++){
      h += `<div class="rnd ${i<round?"done":i===round?"cur":""}">${i<round?"★":i+1}</div>`;
      if (i < R-1) h += `<div class="rline ${i<round?"done":""}"></div>`;
    }
    $("rounds").innerHTML = h;
    $("chanceTxt").textContent = `Chance ${round+1} de ${R}`;
    $("sTitle").textContent = round === 0 ? "Teste sua sorte!" : last ? "Última chance!" : "Segunda chance!";
    $("sSub").textContent = "Raspe todos os campos! 3 iguais = prêmio";
    const grid = last ? winningGrid(premio) : losingGrid();
    $("cells").innerHTML = grid.map(it => `<div class="cell"><span>${it.emoji}</span><b>${esc(it.nome)}</b></div>`).join("");
    const gw = $("gridWrap"); gw.style.animation = "none"; gw.offsetHeight; gw.style.animation = "";
    requestAnimationFrame(() => initCanvas(grid));
  }

  function initCanvas(grid){
    const cv = $("cv"), wrap = $("gridWrap"), ctx = cv.getContext("2d");
    const W = wrap.getBoundingClientRect().width, gap = 2, cell = (W - gap*2)/3, H = cell*3 + gap*2, dpr = 2;
    cv.width = W*dpr; cv.height = H*dpr; cv.style.height = H + "px"; wrap.style.minHeight = H + "px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.globalCompositeOperation = "source-over";
    const rr = () => { const r=16; ctx.beginPath(); ctx.moveTo(r,0); ctx.lineTo(W-r,0); ctx.quadraticCurveTo(W,0,W,r); ctx.lineTo(W,H-r); ctx.quadraticCurveTo(W,H,W-r,H); ctx.lineTo(r,H); ctx.quadraticCurveTo(0,H,0,H-r); ctx.lineTo(0,r); ctx.quadraticCurveTo(0,0,r,0); ctx.closePath(); };
    const g = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.7);
    g.addColorStop(0,"#6B6B6B"); g.addColorStop(.5,"#4A4A4A"); g.addColorStop(1,"#333333");
    rr(); ctx.fillStyle = g; ctx.fill();
    // raios
    ctx.save(); rr(); ctx.clip(); ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let i=0;i<24;i++){ const a=i/24*Math.PI*2, b=(i+.5)/24*Math.PI*2; ctx.beginPath(); ctx.moveTo(W/2,H/2); ctx.lineTo(W/2+Math.cos(a)*W,H/2+Math.sin(a)*W); ctx.lineTo(W/2+Math.cos(b)*W,H/2+Math.sin(b)*W); ctx.closePath(); ctx.fill(); }
    // linhas da grade
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1.5;
    for (let k=1;k<3;k++){ const x=k*(cell+gap)-gap/2; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,x); ctx.lineTo(W,x); ctx.stroke(); }
    ctx.restore();
    // estrelas
    const star = (x,y,s,a) => { ctx.save(); ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.translate(x,y); ctx.beginPath(); for(let i=0;i<5;i++){ const t=i*4*Math.PI/5-Math.PI/2; ctx[i?"lineTo":"moveTo"](Math.cos(t)*s,Math.sin(t)*s); } ctx.closePath(); ctx.fill(); ctx.restore(); };
    [[.12,.08,10,.5],[.5,.05,12,.6],[.88,.1,9,.4],[.08,.92,8,.35],[.92,.88,11,.45],[.25,.95,7,.3],[.75,.03,8,.35]].forEach(([x,y,s,a]) => star(W*x,H*y,s,a));
    // texto
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.min(W*.1,32)}px Inter, sans-serif`; ctx.fillText("RASPE AQUI!", W/2, H/2 + H*.02);
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = `600 ${Math.min(W*.04,13)}px Inter, sans-serif`;
    ctx.fillText("Raspe os 9 campos,", W/2, H/2 + H*.12);
    ctx.fillText("encontre 3 iguais e ganhe!", W/2, H/2 + H*.17);

    const revealed = new Set(); let finished = false, drawing = false, last = null, moves = 0;
    const upd = () => { $("sCount").textContent = `${revealed.size}/9`; $("sFill").style.width = revealed.size/9*100 + "%"; };
    upd();
    const scratch = (x,y) => {
      if (finished) return;
      ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = 38; ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (last){ ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(x,y); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(x,y,19,0,Math.PI*2); ctx.fill(); }
      last = { x, y };
      if (++moves % 3 === 0) sScratch();
      for (let r=0;r<3;r++) for (let c=0;c<3;c++){
        const idx = r*3+c; if (revealed.has(idx)) continue;
        const cx = c*(cell+gap), cy = r*(cell+gap);
        if (x<cx||x>cx+cell||y<cy||y>cy+cell) continue;
        let clear = 0;
        for (let gx=0;gx<5;gx++) for (let gy=0;gy<5;gy++){
          const sx = cx + cell*(.15 + (gx+.5)/5*.7), sy = cy + cell*(.15 + (gy+.5)/5*.7);
          if (ctx.getImageData(sx*dpr, sy*dpr, 1, 1).data[3] < 50) clear++;
        }
        if (clear/25 >= .45){
          revealed.add(idx); upd();
          if (revealed.size >= 9 && !finished){ finished = true; setTimeout(() => roundDone(grid), 400); }
        }
      }
    };
    const pos = e => { const r = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return { x:t.clientX-r.left, y:t.clientY-r.top }; };
    cv.onmousedown = cv.ontouchstart = e => { e.preventDefault(); drawing = true; last = null; const p = pos(e); scratch(p.x,p.y); };
    cv.onmousemove = cv.ontouchmove  = e => { if (!drawing) return; e.preventDefault(); const p = pos(e); scratch(p.x,p.y); };
    cv.onmouseup = cv.onmouseleave = cv.ontouchend = () => { drawing = false; last = null; };
  }

  function roundDone(grid){
    const counts = {}; grid.forEach(g => counts[g.id] = (counts[g.id]||0) + 1);
    const winId = Object.keys(counts).find(k => counts[k] >= 3);
    const left = C.rodadas - round - 1;
    const ov = document.createElement("div");
    if (winId){
      sReveal(); floaties(["🎉","🎊","⭐","💰"], 24); track("ScratchWin", { premio: premio.nome });
      $("sTitle").textContent = "🎉 VOCÊ GANHOU!"; $("sSub").textContent = `Parabéns! Você ganhou ${premio.nome}!`;
      $("wonBox").classList.remove("hidden"); $("wonChips").innerHTML = `<span class="chip">${premio.emoji} ${esc(premio.nome)}</span>`;
      ov.className = "overlay win";
      ov.innerHTML = `<div class="win-box"><p class="tag">🎉 Você ganhou!</p><div class="e">${premio.emoji}</div><h2>${esc(premio.nome)}</h2><p>Parabéns! Seu cupom de ${esc(premio.nome)} na ${esc(C.loja)} foi liberado.</p><button class="btn glow">RESGATAR MEU CUPOM</button></div>`;
      ov.querySelector("button").onclick = () => { ov.remove(); showResult(); };
    } else {
      sWrong();
      ov.className = "overlay lose";
      ov.innerHTML = `<div class="lose-box"><div style="font-weight:900;font-size:1.3rem">${C.logo?`<img src="${esc(C.logo)}" style="height:56px">`:esc(C.loja)}</div><div class="e">😔</div><h2>Não foi dessa vez...</h2><p>${left>0 ? `Mas calma! Você ainda tem ${left} chance${left>1?"s":""}! 🍀` : "Tente novamente!"}</p><button class="btn">${left>0?"TENTAR DE NOVO ›":"CONTINUAR ›"}</button></div>`;
      ov.querySelector("button").onclick = () => { ov.remove(); round = Math.min(round+1, C.rodadas-1); renderRound(); };
    }
    document.body.appendChild(ov);
  }

  /* ---------- resultado ---------- */
  function showResult(){
    const p = store.get("premio"), lead = store.get("lead") || {};
    let exp = store.get("expira");
    if (!exp){ exp = Date.now() + C.validadeDias*864e5; store.set("expira", exp); }
    const dt = new Date(exp).toLocaleDateString("pt-BR", { day:"2-digit", month:"long" });
    const first = (lead.nome || "").split(" ")[0];
    $("dNome").textContent = first ? ", " + first.toUpperCase() : "";
    $("dEmoji").textContent = $("dEmoji2").textContent = p.emoji;
    $("dPremio").textContent = $("dPremio2").textContent = p.nome.toUpperCase();
    $("dPremio3").textContent = p.nome;
    $("dCode").textContent = p.codigo;
    $("dValid").textContent = "✓ Válido até " + dt;
    $("faqValid").textContent = `Seu cupom vale até ${dt}. Depois disso ele expira.`;
    $("faqRegras").textContent = C.regras;
    const url = new URL(C.urlLoja);
    url.searchParams.set(C.parametroCupom, p.codigo);
    Object.entries(store.get("utm") || {}).forEach(([k,v]) => url.searchParams.set(k, v));
    $("dCta").href = url.toString();
    $("dCta").onclick = () => track("GoToStore", { coupon: p.codigo });
    show("done");
  }
  function copyCode(btn){
    const ok = () => { btn.textContent = "COPIADO!"; sCorrect(); setTimeout(() => btn.textContent = "COPIAR", 1800); };
    const sel = () => { const r = document.createRange(); r.selectNodeContents($("dCode")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "SELECIONADO"; };
    try { navigator.clipboard.writeText($("dCode").textContent).then(ok, sel); } catch { sel(); }
  }

  $("btnStart").addEventListener("click", go);
  $("btnApproved").addEventListener("click", afterApproved);
  $("btnCopy").addEventListener("click", e => copyCode(e.currentTarget));
}
