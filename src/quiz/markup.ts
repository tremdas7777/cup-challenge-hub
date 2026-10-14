export const MARKUP = `
<!-- SPLASH -->
<section class="view on" id="v-splash">
  <div class="brand-splash"></div>
  <div class="dots"><i></i><i></i><i></i></div>
</section>

<!-- HOME -->
<section class="view" id="v-home">
  <div class="logobar brand"></div>
  <div class="hero" id="hero">
    <h1 id="hTitulo"></h1>
    <p id="hSub"></p>
    <button class="btn glow shine" style="max-width:384px" id="btnStart">COMEÇAR AGORA</button>
    <small>100% grátis · 2 minutos · resultado na hora</small>
  </div>
</section>

<!-- QUIZ -->
<section class="view" id="v-quiz">
  <div class="logobar brand"></div>
  <div class="qwrap">
    <div class="qtop"><span id="qCount"></span><span class="acertos" id="qScore"></span></div>
    <div class="card">
      <span class="badge" id="qBadge"></span>
      <h2 id="qText"></h2>
      <div id="qOpts"></div>
    </div>
    <div class="qdots" id="qDots"></div>
    <div id="qFeed"></div>
  </div>
</section>

<!-- LOADING / APROVADO -->
<section class="view stripes" id="v-load">
  <div id="loadA">
    <div class="brand-load"></div>
    <h2>VERIFICANDO RESULTADO</h2>
    <div class="pbar"><i id="pFill"></i></div>
    <p style="font-weight:700;font-size:.875rem;opacity:.8" id="pTxt">Processando...</p>
  </div>
  <div id="loadB" class="hidden">
    <svg class="ok-ico" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <h1 class="big">APROVADO!</h1>
    <p class="gold">VOCÊ PODE JOGAR A RASPADINHA</p>
    <p style="font-size:1.1rem;font-weight:600;opacity:.8" id="chancesTxt"></p>
    <button class="btn glow" style="margin-top:32px;max-width:340px;margin-left:auto;margin-right:auto;border-radius:12px" id="btnApproved">JOGAR RASPADINHA</button>
  </div>
</section>

<!-- LEAD -->
<section class="view stripes" id="v-lead">
  <form class="leadbox" id="leadForm" novalidate>
    <h2>Falta pouco! 🎉</h2>
    <p class="s">Informe seus dados para liberar a raspadinha e receber seu cupom.</p>
    <label for="nome">Seu nome</label>
    <input id="nome" type="text" autocomplete="given-name">
    <label for="whats">WhatsApp</label>
    <input id="whats" type="tel" inputmode="numeric" autocomplete="tel" placeholder="(11) 99999-9999">
    <label class="chk" style="text-transform:none;letter-spacing:0;font-weight:400"><input type="checkbox" id="lgpd">
      <span>Aceito receber meu cupom e ofertas da <b class="lojaNome"></b> pelo WhatsApp. Posso cancelar quando quiser.</span></label>
    <div class="err" id="err"></div>
    <button class="btn glow" type="submit">LIBERAR RASPADINHA</button>
  </form>
</section>

<!-- RASPADINHA -->
<section class="view" id="v-scratch">
  <div class="logobar brand"></div>
  <div class="rounds" id="rounds"></div>
  <p class="chance" id="chanceTxt"></p>
  <div class="smain">
    <div class="sbox">
      <div class="stitle"><h2 id="sTitle"></h2><p id="sSub">Raspe todos os campos! 3 iguais = prêmio</p></div>
      <div class="sprog"><span>Campos raspados</span><span id="sCount">0/9</span></div>
      <div class="sbar"><i id="sFill"></i></div>
      <div class="grid-wrap" id="gridWrap">
        <div class="cells" id="cells"></div>
        <canvas id="cv"></canvas>
      </div>
      <p class="legend">Encontre 3 símbolos iguais para ganhar o prêmio</p>
      <div class="won hidden" id="wonBox"><p>Prêmio conquistado</p><div id="wonChips"></div></div>
    </div>
  </div>
</section>

<!-- RESULTADO -->
<section class="view" id="v-done">
  <div class="logobar brand"></div>
  <div class="victory">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
    <h1>PARABÉNS<span id="dNome"></span>!</h1>
    <p>Você desbloqueou seu prêmio exclusivo!</p>
  </div>
  <div class="goldband"><div class="in">
    <div class="ic" id="dEmoji"></div>
    <div><small>Seu prêmio</small><h3 id="dPremio"></h3><p>Use o cupom abaixo no site da <b class="lojaNome"></b> e o desconto é aplicado na hora.</p></div>
  </div></div>
  <div class="dwrap">
    <div class="sec-t"><i></i><h2>Seu cupom</h2><i></i></div>
    <div class="prize-card">
      <div class="top"><span class="lbl">Exclusivo</span><span id="dEmoji2"></span></div>
      <div class="bd">
        <h3 id="dPremio2"></h3>
        <p class="s">Válido para compras no site oficial da <span class="lojaNome"></span></p>
        <div class="code"><span id="dCode"></span><button id="btnCopy">COPIAR</button></div>
        <p class="valid" id="dValid"></p>
      </div>
    </div>
    <div class="cta">
      <small>Último passo</small>
      <h3>USE SEU CUPOM AGORA</h3>
      <p>Clique no botão, escolha seus produtos e o desconto <b id="dPremio3" style="color:var(--dest)"></b> já vai aplicado no carrinho.</p>
      <a class="btn glow" id="dCta" href="#">IR PARA A LOJA</a>
    </div>
    <div class="trust">
      <div><div class="i">🔒</div><h4>Compra segura</h4><p>Site protegido</p></div>
      <div><div class="i">🏷️</div><h4>Cupom real</h4><p>Aplicado no carrinho</p></div>
      <div><div class="i">💬</div><h4>Atendimento</h4><p>Fale com a gente</p></div>
    </div>
    <div class="card faq">
      <h3>Perguntas frequentes</h3>
      <div class="q"><b>Como uso meu cupom?</b><span>Clique em "Ir para a loja". Se o desconto não aparecer sozinho, cole o código no campo de cupom do carrinho.</span></div>
      <div class="q"><b>Até quando vale?</b><span id="faqValid"></span></div>
      <div class="q"><b>Posso juntar com outras promoções?</b><span id="faqRegras"></span></div>
      <div class="q"><b>Meus dados estão seguros?</b><span>Usamos seu WhatsApp apenas para enviar o cupom e novidades da loja. Você pode pedir para sair a qualquer momento.</span></div>
    </div>
  </div>
  <footer><div class="in" id="foot"></div></footer>
</section>
`;
