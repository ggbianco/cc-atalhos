/*! cc-atalhos v4 — formulário de respostas rápidas (tema navy).
 *  O Claude escreve só os DADOS, em JSON (que o navegador não executa); todo o resto mora aqui.
 *
 *  Envelope (o mesmo em todo formulário):
 *    <div id="ccf">Formulário carregando. Se ele não aparecer, responda por texto: S aceita as sugestões, ou 1b 2a.</div>
 *    <script type="application/json" id="ccd">{"a":"<nome>","q":[{"t":"…","o":[{"e":"🚀","l":"…","s":"…","r":1}]}]}<\/script>
 *    <script src="https://cdn.jsdelivr.net/gh/ggbianco/cc-atalhos@v4.1.3/cc-atalhos.js"><\/script>
 *
 *  Dados (campo omitido = padrão):
 *    a  autor (nome de quem responde)          i  introdução
 *    q[] perguntas, numeradas pela posição      q.t título (obrigatório)
 *    q.m "m" = escolha múltipla                 q.w "por que estou perguntando" (abre e fecha)
 *    q.k "i" o Claude inferiu · "f" só você sabe (sem sugestão, ganha "Não sei") · "x" vai para fora (nada é enviado por aqui)
 *    q.o[] opções, letras pela posição          o.e emoji · o.l rótulo · o.s consequência · o.r sugerida
 *
 *  Compatível com o formato antigo: ccAtalhos({autor, intro, qs:[{n,t,mode,opts:[{c,e,l,sub,rec}]}]}) continua montando.
 *  A linha do #ccf nasce visível e só some depois que o formulário montou (trava que segura: sem JS, o texto de reserva fica).
 *  O texto enviado leva um selo ⟦qr·xxxx⟧ calculado dos dados: a trava de envio e o painel reconhecem o formulário
 *  por ele, e não pelo nome de quem responde. Sem dependências, sem rede, sem coleta.
 */
(function () {
  "use strict";
  var V = "4.1.3";

  // ───────── utilitários ─────────
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = String(txt);
    return n;
  }
  // O app repinta <button>: a cor vinda de classe sai transparente (sonda de 20/10/2026, painel dividido).
  // Por isso todo botão é um <span role="button">, que o app não toca, com Tab, Enter e Espaço funcionando.
  function bt(cls, txt) {
    var n = el("span", cls, txt);
    n.setAttribute("role", "button"); n.tabIndex = 0;
    n.addEventListener("keydown", function (ev) {
      if ((ev.key === "Enter" || ev.key === " ") && !ev.metaKey && !ev.ctrlKey) { ev.preventDefault(); n.click(); }
    });
    return n;
  }
  function ic(nome) { var i = el("i", "ti ti-" + nome); i.setAttribute("aria-hidden", "true"); return i; }
  function hash(s) { // djb2, 4 dígitos hexadecimais: identifica o formulário sem o Claude escrever nada
    var h = 5381; for (var k = 0; k < s.length; k++) h = ((h << 5) + h + s.charCodeAt(k)) >>> 0;
    return ("0000" + (h & 0xffff).toString(16)).slice(-4);
  }
  var LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // ───────── o que é igual em todo formulário ─────────
  var ACOES = [
    { k: "comp", ic: "pencil", l: "Complementar", d: "Escrever uma instrução para o Claude sobre esta pergunta", cor: "azul" },
    { k: "naoent", ic: "help", l: "Não entendi", d: "O Claude reescreve a pergunta com mais contexto antes de seguir", cor: "ambar" },
    { k: "nenhuma", ic: "ban", l: "Nenhuma serve", d: "Nenhuma opção serve: o Claude propõe outras", cor: "verm" },
    { k: "adiar", ic: "clock", l: "Adiar", d: "Decidir depois: vira tarefa no Notion com a data, e o Claude traz o assunto de volta", cor: "roxo" },
    { k: "encerrar", ic: "door-exit", l: "Encerrar assunto", d: "O Claude não volta a este assunto neste chat, a menos que você peça", cor: "cinza" }
  ];
  var EXCLUSIVAS = ["naoent", "nenhuma", "adiar", "encerrar"]; // uma de cada vez, e cada uma limpa a escolha das opções
  // GIFs da leveza: guardados no próprio repositório (o chat não carrega Giphy nem Tenor; jsDelivr sim, teste de 20/10/2026).
  // O Claude escreve só o nome: {"z":{"g":"martelo","c":"DECIDIDO","t":"…"}}.
  var GIFS = ["alivio", "aplausos", "aura", "confete", "danca", "divou", "feno", "levelup", "martelo", "match", "micdrop", "peruca", "rip", "sparkjoy", "supergirl", "tudobem"];
  var BASE_GIF = window.QR_GIF_BASE || "https://cdn.jsdelivr.net/gh/ggbianco/cc-atalhos@v" + V + "/gifs/"; // a troca é só para a página de teste
  var DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  function hoje0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function maisDias(n) { var d = hoje0(); d.setDate(d.getDate() + n); return d; }
  function proxSegunda() { var d = hoje0(), k = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + k); return d; }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function br(d) { return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); }
  function rel(d) { // data relativa, como o Giovanni pediu no v8: Hoje, Amanhã, Em 3 dias, Próxima segunda
    var n = Math.round((d - hoje0()) / 86400000);
    if (n === 0) return "hoje"; if (n === 1) return "amanhã"; if (n < 0) return "há " + (-n) + " dias";
    if (+d === +proxSegunda() && n > 1) return "próxima segunda";
    return "em " + n + " dias";
  }
  var RODAPE = [
    { g: "Tamanho", u: 1, it: [["🐦", "Tuíte", "=short (tamanho: tuíte, poucas linhas)"], ["✂️", "Curto", "=short"], ["📄", "Médio", "tamanho médio"], ["📚", "Completo", "=long"], ["🗂️", "Super completo", "=long =max"]] },
    { g: "Profundidade", u: 1, it: [["🧸", "ELI5", "profundidade: ELI5 (como para uma criança de 5 anos)"], ["📘", "Para leigos", "profundidade: para leigos"], ["🎓", "ELI15", "profundidade: ELI15 (adolescente esperto)"], ["🍎", "Professor favorito", "profundidade: professor favorito (expert que explica com didática)"], ["🍻", "Papo de bar", "profundidade: papo de bar"], ["🛠️", "Colega da área", "profundidade: colega da área"], ["🔬", "Expert", "profundidade: expert"], ["👵", "ELI vó", "profundidade: ELI vó (sem inglês nem sigla, com exemplos do dia a dia)"], ["🥪", "Sanduíche", "profundidade: sanduíche (a mesma ideia em 3 níveis: para leigos, professor favorito e expert)"]] },
    { g: "Como pensar", u: 0, it: [["🌐", "Pesquisar na web", "=web"], ["🧠", "Pensar fundo", "=deep"], ["🧩", "Comparar opções", "=opt"], ["🗺️", "Plano em passos", "=plan"]] },
    { g: "Conselho", u: 0, conselho: 1, it: [["🧭", "Estratégia (CEO)", "estratégia (CEO)"], ["💰", "Finanças (CFO)", "finanças (CFO)"], ["📣", "Marketing", "marketing"], ["🤝", "Vendas e parcerias", "vendas e parcerias"], ["🎨", "Produto e UX", "produto e UX"], ["⚙️", "Tecnologia", "tecnologia"], ["⚖️", "Jurídico", "jurídico"], ["🙋", "Cliente", "o cliente"], ["📈", "Investidor", "investidor"]] }
  ];

  var CSS =
    ".qr{--acc:#0D2C54;--accbg:rgba(13,44,84,.06);--verde:#1F7A4D;--verdebg:rgba(31,122,77,.08);--azul:#2563A8;--ambar:#9A6100;--verm:#B3261E;--roxo:#6B4FBB;" +
    "background:var(--surface-2,#fff);border:.5px solid var(--border,#ddd);border-radius:14px;padding:1.25rem 1.35rem;margin:1rem 0;font-family:var(--font-sans,system-ui);color:var(--text-primary,#222)}" +
    "@media (prefers-color-scheme:dark){.qr{--acc:#9DBCE8;--accbg:rgba(157,188,232,.10);--verde:#6FCF97;--verdebg:rgba(111,207,151,.10);--azul:#8AB4F8;--ambar:#F2C46D;--verm:#F28B82;--roxo:#B9A6F5}}" +
    ".qr *{box-sizing:border-box}.qr [hidden]{display:none!important}" +
    ".qr .intro{font-size:15px;color:var(--text-secondary,#555);margin:0 0 1.3rem;line-height:1.55}" +
    ".qr .qb{margin:0 0 1.6rem}" +
    ".qr .qh{color:#fff;background:#0D2C54;padding:10px 14px;border-radius:8px;font-size:16px;font-weight:600;display:flex;align-items:center;gap:10px;flex-wrap:wrap}" +
    ".qr .qh .num{font-weight:700;font-variant-numeric:tabular-nums}" +
    ".qr .qh .tt{flex:1;min-width:0}" +
    ".qr .kind{font-size:12px;font-weight:500;border-radius:999px;padding:1px 9px;background:rgba(255,255,255,.16);white-space:nowrap}" +
    ".qr .whyb{background:none;border:none;color:#fff;opacity:.85;cursor:pointer;font-size:13px;padding:0;display:flex;align-items:center;gap:4px}" +
    ".qr .whyb:hover{opacity:1;text-decoration:underline}" +
    ".qr .why{font-size:14px;line-height:1.6;color:var(--text-secondary,#555);background:var(--surface-1,#f6f6f6);border-radius:8px;padding:10px 14px;margin:8px 0 0;text-align:right}" +
    ".qr .note{font-size:13.5px;color:var(--text-secondary,#555);margin:8px 0 0 6px;display:flex;gap:6px;align-items:flex-start}" +
    ".qr .opts{margin:8px 0 0;padding-left:6px}" +
    ".qr .opt{display:flex;align-items:flex-start;gap:10px;padding:10px 9px;cursor:pointer;font-size:15px;border:1.5px solid transparent;border-radius:9px;position:relative;transition:background .12s,border-color .12s}" +
    ".qr .opt+.opt{margin-top:2px}" +
    ".qr .opt+.opt::before{content:'';position:absolute;left:9px;right:9px;top:-2px;border-top:1px solid var(--border,#e6e6e6)}" +
    ".qr .opt:hover{background:var(--surface-1,#f4f4f4)}" +
    ".qr .opt.sel{border-color:var(--acc);background:var(--accbg)}" +
    ".qr .opt.sel::before,.qr .opt.sel+.opt::before{display:none}" +
    ".qr .opt input{position:absolute;opacity:0;width:1px;height:1px}" +
    ".qr .opt:focus-within{outline:2px solid var(--acc);outline-offset:1px}" +
    ".qr .key{width:26px;height:26px;flex:none;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--border-strong,#bbb);border-radius:50%;font-family:var(--font-mono,monospace);font-size:14px;font-weight:600;color:var(--text-secondary,#555);margin-top:1px}" +
    ".qr .multi .key{border-radius:6px}" +
    ".qr .opt[data-rec] .key{border:2px solid var(--verde);color:var(--verde)}" +
    ".qr .opt.sel .key{background:var(--acc);border-color:var(--acc);color:var(--surface-2,#fff)}" +
    ".qr .oe{font-size:15px;flex:none;line-height:26px}" +
    ".qr .lbl{flex:1;min-width:0;line-height:1.5;padding-top:2px}" +
    ".qr .lbl .s{display:block;font-size:13.5px;color:var(--text-secondary,#666);margin-top:2px}" +
    ".qr .tag{display:inline-flex;align-items:center;gap:3px;font-size:12px;color:var(--verde);background:var(--verdebg);border-radius:999px;padding:0 8px;margin-left:6px;font-weight:600;line-height:1.6;vertical-align:1px;white-space:nowrap}" +
    ".qr .qa{display:flex;gap:6px;flex-wrap:wrap;margin:9px 0 0 6px}" +
    ".qr [role=button]{cursor:pointer}.qr [role=button]:focus-visible{outline:2px solid var(--acc);outline-offset:2px}" +
    ".qr .ab{position:relative;display:inline-flex;align-items:center;gap:5px;font-size:13px;padding:5px 11px;border-radius:999px;border:1px solid var(--border,#ddd);background:var(--surface-2,#fff);color:var(--text-secondary,#555);cursor:pointer;transition:all .1s}" +
    ".qr .ab[data-c=azul]:hover,.qr .ab[data-c=azul].on{color:var(--azul);border-color:var(--azul)}" +
    ".qr .ab[data-c=ambar]:hover,.qr .ab[data-c=ambar].on{color:var(--ambar);border-color:var(--ambar)}" +
    ".qr .ab[data-c=verm]:hover,.qr .ab[data-c=verm].on{color:var(--verm);border-color:var(--verm)}" +
    ".qr .ab[data-c=roxo]:hover,.qr .ab[data-c=roxo].on{color:var(--roxo);border-color:var(--roxo)}" +
    ".qr .ab[data-c=cinza]:hover,.qr .ab[data-c=cinza].on{color:var(--text-primary,#222);border-color:var(--text-secondary,#555)}" +
    ".qr .ab.off,.qr .opts.off{opacity:.38;pointer-events:none}" +
    ".qr .adp{margin:8px 0 0 6px;padding:10px 12px;border-radius:9px;background:var(--surface-1,#f6f6f6);display:flex;flex-wrap:wrap;gap:6px;align-items:center}" +
    ".qr .adp input[type=date]{font-size:14px;padding:4px 8px;border:1px solid var(--border-strong,#bbb);border-radius:7px;background:var(--surface-2,#fff);color:var(--text-primary,#222)}" +
    ".qr .adp .rel{font-size:13.5px;color:var(--roxo);font-weight:600}" +
    ".qr .festa{position:relative;overflow:hidden;margin:10px 0 0 6px;padding:14px;border-radius:12px;background:var(--surface-1,#f6f6f6);display:flex;gap:14px;align-items:center;flex-wrap:wrap;animation:qr-pop .35s ease-out}" +
    ".qr .festa img{width:150px;max-width:100%;border-radius:9px;flex:none}" +
    ".qr .festa .fx{flex:1;min-width:160px}" +
    ".qr .festa .carimbo{display:inline-block;font-weight:800;font-size:15px;letter-spacing:.06em;color:var(--verm);border:3px solid var(--verm);border-radius:8px;padding:3px 10px;transform:rotate(-6deg);margin:0 0 8px;animation:qr-carimbo .45s cubic-bezier(.2,1.6,.4,1)}" +
    ".qr .festa .ft{font-size:18px;font-weight:700;line-height:1.35}" +
    ".qr .cf{position:absolute;top:-10px;width:8px;height:12px;border-radius:2px;animation:qr-cai 1.6s ease-in forwards;pointer-events:none}" +
    "@keyframes qr-pop{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}" +
    "@keyframes qr-carimbo{from{transform:rotate(-6deg) scale(2.2);opacity:0}to{transform:rotate(-6deg) scale(1);opacity:1}}" +
    "@keyframes qr-cai{to{transform:translateY(260px) rotate(540deg);opacity:0}}" +
    "@media (prefers-reduced-motion:reduce){.qr .cf{display:none}.qr .festa,.qr .festa .carimbo{animation:none}}" +
    ".qr .ab.tem::after{content:' ✎ escrito';font-size:11.5px;color:var(--azul);font-weight:600}" +
    ".qr .ab.on{font-weight:600;background:var(--surface-1,#f4f4f4)}" +
    ".qr .ab .tip{position:absolute;top:calc(100% + 6px);left:0;z-index:5;width:max-content;max-width:260px;background:#1E293B;color:#fff;font-size:12.5px;font-weight:400;line-height:1.45;padding:6px 9px;border-radius:7px;opacity:0;pointer-events:none;transition:opacity .1s}" +
    ".qr .ab:hover .tip,.qr .ab:focus-visible .tip{opacity:1;transition-delay:.1s}" +
    ".qr textarea{width:calc(100% - 6px);margin:8px 0 0 6px;background:var(--surface-2,#fff);border:1px solid var(--border-strong,#bbb);border-radius:8px;font-family:var(--font-sans,system-ui);font-size:15px;line-height:1.5;padding:9px 12px;color:var(--text-primary,#222);resize:vertical;min-height:84px}" +
    ".qr .warn{font-size:14px;color:var(--verm);margin:6px 0 0 6px}" +
    ".qr details.ajuste{margin:1.4rem 0 0;border-top:.5px solid var(--border,#ddd);padding-top:.9rem}" +
    ".qr details.ajuste summary{cursor:pointer;font-size:14.5px;font-weight:600;color:var(--text-primary,#222);list-style:none;display:flex;align-items:center;gap:7px}" +
    ".qr details.ajuste summary::-webkit-details-marker{display:none}" +
    ".qr .aj-sub{font-size:13px;color:var(--text-secondary,#666);font-weight:400}" +
    ".qr .grp{margin:12px 0 0}" +
    ".qr .gl{font-size:13px;color:var(--text-secondary,#666);margin:0 0 6px;font-weight:600}" +
    ".qr .chips{display:flex;flex-wrap:wrap;gap:6px}" +
    ".qr .chip{font-size:13.5px;padding:5px 11px;border-radius:999px;border:1px solid var(--border,#ddd);background:var(--surface-2,#fff);color:var(--text-primary,#222);cursor:pointer}" +
    ".qr .chip:hover{background:var(--surface-1,#f4f4f4)}" +
    ".qr .chip.on{border-color:var(--acc);background:var(--accbg);font-weight:600}" +
    ".qr .cons{margin:8px 0 0;padding:10px 12px;border-radius:9px;background:var(--surface-1,#f6f6f6)}" +
    ".qr .foot{margin-top:1.5rem;padding-top:1.1rem;border-top:.5px solid var(--border,#ddd)}" +
    ".qr .gobs{min-height:44px;margin:0 0 14px;width:100%}" +
    ".qr .acts{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px}" +
    ".qr .acts .dir{display:flex;gap:8px;flex-wrap:wrap}" +
    ".qr .btn{display:inline-flex;user-select:none;align-items:center;gap:8px;font-size:15px;font-weight:500;padding:11px 20px;border-radius:10px;cursor:pointer;border:1px solid transparent}" +
    ".qr .btn:active{transform:scale(.98)}" +
    ".qr .reset{background:var(--surface-1,#f4f4f4);color:var(--text-secondary,#555);border-color:var(--border,#ddd);font-size:14px;padding:10px 16px}" +
    ".qr .copy{background:var(--surface-2,#fff);color:var(--text-primary,#222);border-color:var(--acc)}" +
    ".qr .send{background:#0D2C54;color:#fff}" +
    ".qr .primary{background:#0D2C54!important;color:#fff!important;border-color:#0D2C54!important}" +
    ".qr .st{font-size:13.5px;color:var(--text-secondary,#555);margin:0 0 10px;min-height:1.2em}" +
    ".qr .pvlab{font-size:12.5px;color:var(--text-muted,#888);margin:0 0 6px}" +
    ".qr .pv{font-size:14px;color:var(--text-primary,#222);background:var(--surface-1,#f6f6f6);padding:12px 14px;border-radius:10px;border:1px solid var(--border-strong,#ccc);white-space:pre-wrap;line-height:1.65;overflow-wrap:anywhere}" +
    ".qr .ver{font-size:11px;color:var(--text-muted,#999);text-align:right;margin:8px 0 0}";

  // ───────── normalizar os dados (formato novo e antigo) ─────────
  function normalizar(cfg) {
    cfg = cfg || {};
    var antigo = !!cfg.qs;
    var lista = (antigo ? cfg.qs : cfg.q) || [];
    return {
      autor: String((antigo ? cfg.autor : cfg.a) || "").trim(),
      intro: String((antigo ? cfg.intro : cfg.i) || ""),
      qs: lista.map(function (Q, idx) {
        Q = Q || {};
        var ops = (antigo ? Q.opts : Q.o) || [];
        var k = Q.k === "i" || Q.k === "f" || Q.k === "x" ? Q.k : "";
        var multi = antigo ? Q.mode === "multi" : Q.m === "m";
        var jaSug = false;
        var opts = ops.map(function (o, j) {
          o = o || {};
          var rec = !!(antigo ? o.rec : o.r);
          if (k === "f") rec = false;                 // fato que só você sabe: nunca vem marcado
          if (!multi && rec) { if (jaSug) rec = false; else jaSug = true; } // escolha única: só a 1ª sugerida
          return { c: String(antigo && o.c ? o.c : LETRAS[j] || "?").toUpperCase(), e: String(o.e || ""), l: String(o.l || "(sem rótulo)"), s: String((antigo ? o.sub : o.s) || ""), rec: rec, z: o.z && typeof o.z === "object" ? o.z : null };
        });
        if (k === "f") opts.push({ c: LETRAS[opts.length] || "?", e: "🤷", l: "Não sei", s: "", rec: false, naosei: true });
        return { n: String(antigo && Q.n ? Q.n : idx + 1), t: String(Q.t || ""), multi: multi, k: k, w: String(Q.w || ""), opts: opts };
      })
    };
  }

  // ───────── montar ─────────
  function montar(cfg, hosp, cru) {
    var D = normalizar(cfg);
    if (!D.qs.length) throw new Error("nenhuma pergunta nos dados");
    var SELO = "⟦qr·" + hash(cru || JSON.stringify(cfg)) + "⟧";
    var temSP = typeof window.sendPrompt === "function";

    if (!document.getElementById("qr-css")) { var st = el("style"); st.id = "qr-css"; st.textContent = CSS; document.head.appendChild(st); }
    var ff = el("div", "qr");
    if (D.intro) ff.appendChild(el("p", "intro", D.intro));
    var blocos = [], defeito = [];

    D.qs.forEach(function (Q) {
      var b = el("div", "qb" + (Q.multi ? " multi" : ""));
      try {
        if (!Q.t) throw new Error("pergunta sem título");
        if (!Q.opts.length) throw new Error("pergunta sem opções");
        var h = el("div", "qh");
        h.appendChild(el("span", "num", Q.n + ")"));
        h.appendChild(el("span", "tt", Q.t));
        var KIND = { i: "🤖 o Claude inferiu", f: "🙋 só você sabe", x: "📤 vai para fora" };
        if (Q.k) h.appendChild(el("span", "kind", KIND[Q.k]));
        var why = null;
        if (Q.w) {
          var wb = bt("whyb");
          wb.appendChild(ic("info-circle")); wb.appendChild(document.createTextNode("Por que estou perguntando"));
          h.appendChild(wb);
          why = el("div", "why", Q.w); why.hidden = true;
          wb.addEventListener("click", function () { why.hidden = !why.hidden; });
        }
        b.appendChild(h);
        if (why) b.appendChild(why);
        if (Q.k === "x") {
          var nt = el("div", "note"); nt.appendChild(ic("shield-check"));
          nt.appendChild(el("span", null, "Escolher aqui não envia nada. O envio só acontece quando você digitar a ordem no chat (por exemplo, \"pode enviar\")."));
          b.appendChild(nt);
        }
        var os = el("div", "opts"); os.setAttribute("role", Q.multi ? "group" : "radiogroup"); os.setAttribute("aria-label", Q.t);
        Q.opts.forEach(function (o) {
          var lb = el("label", "opt");
          var inp = el("input"); inp.type = Q.multi ? "checkbox" : "radio"; inp.name = "q" + Q.n + "-" + SELO;
          lb.appendChild(inp);
          lb.appendChild(el("span", "key", o.c));
          if (o.e) lb.appendChild(el("span", "oe", o.e));
          var l = el("span", "lbl"); l.appendChild(document.createTextNode(o.l));
          if (o.rec) { var tg = el("span", "tag"); tg.appendChild(ic("check")); tg.appendChild(document.createTextNode("Sugerido")); l.appendChild(tg); }
          if (o.s) l.appendChild(el("span", "s", o.s));
          lb.appendChild(l);
          if (o.rec) lb.setAttribute("data-rec", "");
          lb._o = o; lb._inp = inp;
          os.appendChild(lb);
        });
        b.appendChild(os);
        var qa = el("div", "qa");
        var ta = el("textarea"); ta.placeholder = "Escreva aqui a sua instrução para o Claude sobre esta pergunta…"; ta.hidden = true;
        var act = {};
        var adp = el("div", "adp"); adp.hidden = true;
        var dataIn = el("input"); dataIn.type = "date"; dataIn.setAttribute("aria-label", "Data para retomar");
        var relEl = el("span", "rel");
        var Bq = { data: null };
        function poeData(d) { Bq.data = d; dataIn.value = iso(d); relEl.textContent = "(" + rel(d) + ", " + DIAS[d.getDay()] + ")"; ref(); }
        [["Hoje à noite", 0], ["Amanhã", 1], ["Em 3 dias", 3], ["Próxima segunda", "seg"], ["Em 1 semana", 7]].forEach(function (p) {
          var c = bt("chip", p[0]);
          c.addEventListener("click", function () { adp.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); }); c.classList.add("on"); Bq.noite = p[1] === 0; poeData(p[1] === "seg" ? proxSegunda() : maisDias(p[1])); });
          adp.appendChild(c);
        });
        dataIn.addEventListener("change", function () { if (!dataIn.value) return; var q = dataIn.value.split("-"); adp.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); }); Bq.noite = false; poeData(new Date(+q[0], +q[1] - 1, +q[2])); });
        adp.appendChild(dataIn); adp.appendChild(relEl);
        ACOES.forEach(function (A) {
          var bo = bt("ab"); bo.setAttribute("data-c", A.cor);
          bo.appendChild(ic(A.ic)); bo.appendChild(document.createTextNode(A.l)); bo.appendChild(el("span", "tip", A.d));
          bo.addEventListener("click", function () {
            var liga = !bo.classList.contains("on");
            if (A.k === "comp") { bo.classList.toggle("on", liga); ta.hidden = !liga; bo.classList.toggle("tem", !liga && !!ta.value.trim()); if (liga) ta.focus(); }
            else {
              EXCLUSIVAS.forEach(function (k) { act[k].classList.remove("on"); });
              bo.classList.toggle("on", liga);
              if (liga) { os.querySelectorAll(".opt").forEach(function (x) { x.classList.remove("sel"); x._inp.checked = false; }); tiraFesta(b); }
              adp.hidden = !(liga && A.k === "adiar");
              if (A.k === "adiar" && liga && !Bq.data) poeData(hoje0()); // nasce com hoje, como pedido no v8
              var enc = liga && A.k === "encerrar"; // encerrado: o resto da pergunta fica apagado (comentário 14)
              os.classList.toggle("off", enc);
              Object.keys(act).forEach(function (k) { if (k !== "encerrar") act[k].classList.toggle("off", enc); });
            }
            ref();
          });
          act[A.k] = bo; qa.appendChild(bo);
        });
        b.appendChild(qa); b.appendChild(adp); b.appendChild(ta);
        blocos.push({ Q: Q, el: b, os: os, ta: ta, act: act, adp: adp, Bq: Bq });
      } catch (err) {
        defeito.push(Q.n);
        b.textContent = "";
        b.appendChild(el("div", "warn", "⚠️ A pergunta " + Q.n + " veio com defeito (" + err.message + "). Responda a ela por texto."));
      }
      ff.appendChild(b);
    });
    if (!blocos.length) throw new Error("nenhuma pergunta válida");

    // rodapé: ajuste da próxima resposta (nada pré-marcado: sem clique, vale o critério normal do Claude)
    var aj = el("details", "ajuste");
    var sm = el("summary"); sm.appendChild(ic("adjustments-horizontal")); sm.appendChild(document.createTextNode("Ajustar a próxima resposta "));
    sm.appendChild(el("span", "aj-sub", "(opcional; sem clique, o Claude decide)"));
    aj.appendChild(sm);
    var escolhaAj = {};
    RODAPE.forEach(function (G) {
      var gw = el("div", "grp"); gw.appendChild(el("div", "gl", G.g));
      var ch = el("div", "chips");
      escolhaAj[G.g] = [];
      var alvo = ch;
      if (G.conselho) {
        var cb = bt("chip", "🏛️ Montar um conselho");
        var box = el("div", "cons"); box.hidden = true;
        var inner = el("div", "chips"); box.appendChild(el("div", "gl", "Quais perspectivas entram (um agente por perspectiva)?")); box.appendChild(inner);
        cb.addEventListener("click", function () { box.hidden = !box.hidden; cb.classList.toggle("on", !box.hidden); if (box.hidden) { escolhaAj[G.g] = []; inner.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); }); ref(); } });
        ch.appendChild(cb); gw.appendChild(ch); gw.appendChild(box); alvo = inner;
      }
      G.it.forEach(function (it) {
        var c = bt("chip", it[0] + " " + it[1]); c._v = it[2];
        c.addEventListener("click", function () {
          var lig = !c.classList.contains("on");
          if (G.u) alvo.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
          c.classList.toggle("on", lig);
          escolhaAj[G.g] = [].slice.call(alvo.querySelectorAll(".chip.on")).map(function (x) { return x._v; });
          ref();
        });
        alvo.appendChild(c);
      });
      if (!G.conselho) gw.appendChild(ch);
      aj.appendChild(gw);
    });
    ff.appendChild(aj);

    // pé: observação, botões, prévia
    var foot = el("div", "foot");
    var gobs = el("textarea", "gobs"); gobs.placeholder = "Observação geral (opcional)…";
    foot.appendChild(gobs);
    var acts = el("div", "acts");
    var reset = bt("btn reset", "Restaurar sugestões");
    var dir = el("div", "dir");
    var copy = bt("btn copy"); copy.appendChild(ic("copy")); copy.appendChild(document.createTextNode(" Copiar resposta"));
    var send = bt("btn send"); var sendlab = el("span", null, "Enviar"); send.appendChild(sendlab); send.appendChild(ic("arrow-right"));
    dir.appendChild(copy); if (temSP) dir.appendChild(send); else copy.classList.add("primary");
    acts.appendChild(reset); acts.appendChild(dir); foot.appendChild(acts);
    var st2 = el("p", "st"); st2.setAttribute("aria-live", "polite"); foot.appendChild(st2);
    if (!temSP) st2.textContent = "Este painel não consegue enviar direto ao chat. Use Copiar resposta e cole no chat (Cmd+V).";
    foot.appendChild(el("p", "pvlab", "vai chegar no chat assim:"));
    var pv = el("div", "pv"); foot.appendChild(pv);
    foot.appendChild(el("p", "ver", "formulário v" + V + " " + SELO));
    ff.appendChild(foot);

    // ───────── leveza: carimbo, confete e GIF quando a escolha é uma conquista ─────────
    function tiraFesta(b) { var f = b.querySelector(".festa"); if (f) f.remove(); }
    function festa(b, z) {
      var f = el("div", "festa");
      var g = String(z.g || "");
      if (GIFS.indexOf(g) >= 0) { var im = el("img"); im.src = BASE_GIF + g + ".gif"; im.alt = ""; im.onerror = function () { im.remove(); }; f.appendChild(im); }
      var fx = el("div", "fx");
      if (z.c) fx.appendChild(el("div", "carimbo", String(z.c)));
      if (z.t) fx.appendChild(el("div", "ft", String(z.t)));
      f.appendChild(fx);
      var CORES = ["#F8A8A8", "#F0E070", "#78E8B8", "#80B8F0", "#A898F0", "#E098D0", "#F8C888"];
      for (var k = 0; k < 36; k++) {
        var p = el("span", "cf");
        p.style.left = Math.random() * 100 + "%"; p.style.background = CORES[k % CORES.length];
        p.style.animationDelay = Math.random() * 0.4 + "s"; p.style.animationDuration = 1.2 + Math.random() * 0.9 + "s";
        f.appendChild(p);
      }
      var depois = b.querySelector(".qa"); b.insertBefore(f, depois);
      setTimeout(function () { [].forEach.call(f.querySelectorAll(".cf"), function (p) { p.remove(); }); }, 2600);
    }

    // ───────── estado e texto ─────────
    function padrao() {
      blocos.forEach(function (B) {
        B.os.querySelectorAll(".opt").forEach(function (x) { var on = x.hasAttribute("data-rec"); x.classList.toggle("sel", on); x._inp.checked = on; });
        B.ta.value = ""; B.ta.hidden = true;
        Object.keys(B.act).forEach(function (k) { B.act[k].classList.remove("on"); B.act[k].classList.remove("off"); });
        B.os.classList.remove("off"); B.adp.hidden = true; B.Bq.data = null; tiraFesta(B.el);
      });
      aj.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
      aj.querySelectorAll(".cons").forEach(function (x) { x.hidden = true; });
      Object.keys(escolhaAj).forEach(function (k) { escolhaAj[k] = []; });
      aj.open = false; gobs.value = ""; enviado = 0;
      st2.textContent = temSP ? "" : "Este painel não consegue enviar direto ao chat. Use Copiar resposta e cole no chat (Cmd+V).";
    }
    function build() {
      var mexeu = false, L = [];
      var g = gobs.value.trim(); if (g) mexeu = true;
      blocos.forEach(function (B) {
        var sel = [].slice.call(B.os.querySelectorAll(".opt.sel"));
        var rec = [].slice.call(B.os.querySelectorAll(".opt[data-rec]"));
        var c = B.ta.value.trim(); // vale o que está escrito, com a caixa aberta ou fechada (v4.1.2: fechar a caixa apagava o texto)
        var ne = B.act.naoent.classList.contains("on"), nh = B.act.nenhuma.classList.contains("on");
        var ad = B.act.adiar.classList.contains("on") && B.Bq.data, en = B.act.encerrar.classList.contains("on");
        if (sel.map(function (x) { return x._o.c; }).join() !== rec.map(function (x) { return x._o.c; }).join() || c || ne || nh || ad || en) mexeu = true;
        L.push(B.Q.n + ") " + B.Q.t);
        if (en) L.push("🚪 Encerrar assunto: não volte a ele neste chat, a menos que eu peça.");
        else if (ad) L.push("⏰ Adiar para " + br(B.Bq.data) + (B.Bq.noite ? " à noite" : "") + " (" + DIAS[B.Bq.data.getDay()] + ", " + rel(B.Bq.data) + ")");
        else if (ne) L.push("❓ Não entendi: reescreva esta pergunta com mais contexto antes de seguir.");
        else if (nh) L.push("🚫 Nenhuma opção serve: proponha outras.");
        else if (!sel.length) { L.push("(sem resposta, continua aberta)"); mexeu = true; } // "aceita as sugestões" com pergunta aberta enganaria
        sel.forEach(function (x) { var o = x._o; L.push(o.c + (o.e ? " " + o.e : "") + " " + o.l + (o.s ? " (" + o.s + ")" : "")); });
        if (c) L.push("↳ " + c);
        L.push("");
      });
      defeito.forEach(function (n) { L.push(n + ") (a pergunta veio com defeito no formulário; respondo por texto)"); L.push(""); mexeu = true; });
      var aju = [];
      Object.keys(escolhaAj).forEach(function (k) {
        var v = escolhaAj[k]; if (!v.length) return;
        aju.push(k === "Conselho" ? "conselho com as perspectivas: " + v.join(", ") + " (um agente por perspectiva)" : v.join(" "));
      });
      if (aju.length) mexeu = true;
      var cab = mexeu ? (D.autor ? "Respostas de " + D.autor + ":" : "Respostas:") : (D.autor ? D.autor + " aceita as sugestões:" : "Aceito as sugestões:");
      var t = cab + " " + SELO + "\n\n" + L.join("\n").trim();
      if (aju.length) t += "\n\nPara a próxima resposta: " + aju.join(" · ");
      if (g) t += "\n\nObs: " + g;
      return { text: t, mexeu: mexeu };
    }
    function ref() { var r = build(); pv.textContent = r.text; sendlab.textContent = "Enviar"; enviado = 0; send.classList.remove("primary"); salvar(); }

    // ───────── eventos ─────────
    blocos.forEach(function (B) {
      B.os.querySelectorAll(".opt").forEach(function (x) {
        x._inp.addEventListener("click", function (ev) {
          ev.stopPropagation();
          var estava = x.classList.contains("sel");
          if (!B.Q.multi) { B.os.querySelectorAll(".opt").forEach(function (y) { y.classList.remove("sel"); y._inp.checked = false; }); }
          var on = B.Q.multi ? !estava : !estava;
          x.classList.toggle("sel", on); x._inp.checked = on;
          EXCLUSIVAS.forEach(function (k) { B.act[k].classList.remove("on"); B.act[k].classList.remove("off"); });
          B.os.classList.remove("off"); B.adp.hidden = true;
          tiraFesta(B.el); if (on && x._o.z) festa(B.el, x._o.z);
          ref();
        });
      });
      B.ta.addEventListener("input", function () { B.ta.style.height = "auto"; B.ta.style.height = Math.max(84, B.ta.scrollHeight) + "px"; ref(); });
    });
    gobs.addEventListener("input", ref);
    reset.addEventListener("click", function () { padrao(); try { localStorage.removeItem(CHAVE); } catch (e) {} ref(); });

    function avisa(t) { st2.textContent = t; }
    // ───────── rascunho: tudo o que a pessoa marcou e escreveu sobrevive a um redesenho do formulário ─────────
    var CHAVE = "qr:" + SELO, montando = true;
    function estado() {
      return { q: blocos.map(function (B) {
        return { sel: [].slice.call(B.os.querySelectorAll(".opt.sel")).map(function (x) { return x._o.c; }), ta: B.ta.value, aberta: !B.ta.hidden,
          act: Object.keys(B.act).filter(function (k) { return k !== "comp" && B.act[k].classList.contains("on"); }),
          data: B.Bq.data ? iso(B.Bq.data) : null, noite: !!B.Bq.noite };
      }), aj: escolhaAj, ajAberto: aj.open, gobs: gobs.value, enviado: enviado };
    }
    function salvar() { if (montando) return; try { localStorage.setItem(CHAVE, JSON.stringify(estado())); } catch (e) {} }
    function restaurar() {
      var s; try { s = JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch (e) { s = null; }
      if (!s || !s.q) return false;
      blocos.forEach(function (B, i) {
        var e = s.q[i]; if (!e) return;
        B.os.querySelectorAll(".opt").forEach(function (x) { var on = e.sel.indexOf(x._o.c) >= 0; x.classList.toggle("sel", on); x._inp.checked = on; });
        B.ta.value = e.ta || ""; B.ta.hidden = !e.aberta; B.act.comp.classList.toggle("on", !!e.aberta); B.act.comp.classList.toggle("tem", !e.aberta && !!B.ta.value.trim());
        (e.act || []).forEach(function (k) { if (B.act[k]) B.act[k].classList.add("on"); });
        if (e.data) { var q = e.data.split("-"); B.Bq.data = new Date(+q[0], +q[1] - 1, +q[2]); B.Bq.noite = e.noite; B.adp.hidden = (e.act || []).indexOf("adiar") < 0; B.adp.querySelector("input").value = e.data; }
        if ((e.act || []).indexOf("encerrar") >= 0) { B.os.classList.add("off"); Object.keys(B.act).forEach(function (k) { if (k !== "encerrar") B.act[k].classList.add("off"); }); }
      });
      Object.keys(s.aj || {}).forEach(function (g) {
        escolhaAj[g] = s.aj[g] || [];
        aj.querySelectorAll(".chip").forEach(function (c) { if (c._v && escolhaAj[g].indexOf(c._v) >= 0) c.classList.add("on"); });
      });
      if (escolhaAj.Conselho && escolhaAj.Conselho.length) aj.querySelectorAll(".cons").forEach(function (x) { x.hidden = false; });
      aj.open = !!s.ajAberto; gobs.value = s.gobs || "";
      return s;
    }
    function antigo(txt) {
      var ta = el("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta); return ok;
    }
    function seleciona() {
      var s = window.getSelection(), rg = document.createRange();
      rg.selectNodeContents(pv); s.removeAllRanges(); s.addRange(rg);
      avisa("O texto está selecionado: aperte Cmd+C e cole no chat.");
    }
    var OKC = "Copiado ✓ Cole no chat (Cmd+V) e envie.";
    copy.addEventListener("click", function () {
      var txt = build().text;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { avisa(OKC); }, function () { if (antigo(txt)) avisa(OKC); else seleciona(); });
      } else if (antigo(txt)) avisa(OKC); else seleciona();
    });
    var enviado = 0;
    function falhou() { sendlab.textContent = "Enviar"; copy.classList.add("primary"); avisa("O envio direto falhou neste painel. Use Copiar resposta e cole no chat (Cmd+V)."); }
    function enviar() {
      if (!temSP) { copy.click(); return; }
      if (enviado && Date.now() - enviado < 60000) {
        if (sendlab.textContent !== "Reenviar? clique de novo") { sendlab.textContent = "Reenviar? clique de novo"; return; }
      }
      var txt = build().text;
      // v4.1.3: o envio direto às vezes não entrega nada e não acusa erro, e o formulário não enxerga o chat.
      // Por isso todo Enviar também copia a resposta: o plano B vira só Cmd+V, sem voltar ao formulário.
      var hm = new Date().toTimeString().slice(0, 5), copiou = false;
      function msg() {
        if (sendlab.textContent !== "Enviado ✓") return; // o envio falhou: o aviso de falha fica
        avisa("Enviado às " + hm + (copiou ? ". A resposta também foi copiada: se não aparecer no chat em alguns segundos, é só colar (Cmd+V)."
                                           : ". Se não aparecer no chat em alguns segundos, use Copiar resposta."));
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { copiou = true; msg(); }, function () { copiou = antigo(txt); msg(); });
        else copiou = antigo(txt);
      } catch (e) {}
      try {
        var r = window.sendPrompt(txt);
        enviado = Date.now(); salvar();
        sendlab.textContent = "Enviado ✓"; msg();
        if (r && typeof r.then === "function") r.then(null, falhou);
      } catch (e) { falhou(); }
    }
    send.addEventListener("click", enviar);
    ff.addEventListener("keydown", function (ev) { if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") { ev.preventDefault(); enviar(); } });

    padrao();
    var rest = restaurar();
    montando = false; ref();
    if (rest) {
      if (rest.enviado) { enviado = rest.enviado; sendlab.textContent = "Enviado ✓"; avisa("Este formulário já foi enviado às " + new Date(rest.enviado).toTimeString().slice(0, 5) + ". Se não apareceu no chat, use Copiar resposta."); }
      else avisa("Rascunho restaurado: o chat redesenhou o formulário, e nada do que você marcou ou escreveu se perdeu.");
    }
    hosp.textContent = "";
    hosp.appendChild(ff);
    window.CC_ATALHOS_OK = true;
    return ff;
  }

  function falha(hosp, motivo) {
    if (!hosp) return;
    hosp.textContent = "⚠️ O formulário não montou (" + motivo + "). Responda por texto: S aceita as sugestões, ou escreva as escolhas, por exemplo 1b 2a.";
    hosp.setAttribute("style", "font-size:14px;line-height:1.6;padding:12px 14px;border:1px solid #B3261E;border-radius:10px");
  }

  // Formato antigo: ccAtalhos({autor, intro, qs}) chamado por um <script> inline.
  window.ccAtalhos = function (cfg) {
    var hosp = document.getElementById((cfg && cfg.hospede) || "ccf") || document.body;
    try { return montar(cfg, hosp); } catch (e) { falha(hosp, e.message); }
  };
  window.ccAtalhos.versao = V;

  // Formato novo: dados em <script type="application/json" id="ccd">.
  function auto() {
    var d = document.getElementById("ccd");
    if (!d) return; // formato antigo: quem monta é a chamada ccAtalhos(...)
    var hosp = document.getElementById("ccf") || document.body;
    var cru = d.textContent || "";
    var cfg;
    try { cfg = JSON.parse(cru); } catch (e) { falha(hosp, "dados com erro de JSON: " + e.message); return; }
    try { montar(cfg, hosp, cru); } catch (e) { falha(hosp, e.message); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
