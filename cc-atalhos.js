/*! cc-atalhos — formulário de respostas rápidas (tema navy).
 *  Versão "de fora": este arquivo vive num gist público e é servido pelo
 *  jsDelivr, então a sessão emite só os DADOS (AUTOR + INTRO + QS) em vez de
 *  re-emitir o modelo inteiro a cada formulário.
 *
 *  Uso dentro de show_widget — o <script src> vem SEMPRE ANTES do inline que
 *  o usa (variável solta em <script> inline NÃO vira global no widget: provado
 *  em 13/08/2026, o formulário montou a moldura e os botões mas ficou sem
 *  nenhuma pergunta):
 *
 *    <div id="ccf"></div>
 *    <script src="https://cdn.jsdelivr.net/gh/<user>/cc-atalhos@v2/cc-atalhos.js"></script>
 *    <script>
 *      ccAtalhos({
 *        autor: "<nome de quem responde>",
 *        intro: "...",
 *        qs: [{n:"1",t:"...",mode:"single",opts:[{c:"A",e:"🚀",l:"...",sub:"...",rec:1}]}]
 *      });
 *    </script>
 *
 *  `autor` é passado por quem chama (não fica gravado aqui) — sem ele, o texto
 *  sai sem nome. Sem dependências, sem rede, sem coleta.
 */
window.ccAtalhos = function (cfg) {
  cfg = cfg || {};
  var HOSPEDE = document.getElementById(cfg.hospede || "ccf") || document.body;
  var AUTOR = String(cfg.autor || "").trim();
  var INTRO = cfg.intro || "";
  var QS = cfg.qs || [];

  var CSS =
    ".ff{--t:#0D2C54;background:var(--surface-2);border:.5px solid var(--border);border-radius:14px;padding:1.25rem 1.35rem;margin:1rem 0}" +
    ".intro{font-size:14px;color:var(--text-secondary);margin:0 0 1.35rem;line-height:1.55}" +
    ".qb{margin:0 0 1.5rem}" +
    ".qh{color:#fff;background:#0D2C54;padding:9px 13px;border-radius:8px;font-size:15px;font-weight:600;margin:0 0 10px;display:flex;align-items:center;gap:10px}" +
    ".qh .num{font-weight:700;font-variant-numeric:tabular-nums}" +
    ".opts{display:flex;flex-direction:column;gap:3px;padding-left:6px}" +
    ".opt{display:flex;align-items:center;gap:10px;padding:9px;border-radius:9px;cursor:pointer;font-size:14px;transition:background .12s,border-color .12s;border:1.5px solid transparent}" +
    ".opt:hover{background:var(--surface-1)}" +
    ".opt.sel{border:1.5px solid var(--t);background:rgba(13,44,84,.05)}" +
    ".key{width:25px;height:25px;flex:none;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--border-strong);border-radius:50%;font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--text-secondary);transition:all .12s}" +
    ".multi .key{border-radius:6px}" +
    ".opt[data-rec] .key{border:2px solid var(--t);color:var(--t)}" +
    ".opt.sel .key{background:var(--t);border-color:var(--t);color:#fff}" +
    ".oemoji{font-size:14px;flex:none;line-height:1}" +
    ".lbl{flex:1;font-size:14px;color:var(--text-primary)}" +
    ".lbl .sub{color:var(--text-secondary)}" +
    ".tag{display:inline-block;font-size:11px;color:#0D2C54;background:#fff;border:1px solid #0D2C54;border-radius:5px;padding:0 7px;margin-left:5px;font-weight:500;line-height:1.5;vertical-align:middle;white-space:nowrap}" +
    ".qobs{width:100%;margin:7px 0 0 6px;box-sizing:border-box;background:var(--surface-2);border:1px solid var(--border-strong);border-radius:8px;font-family:var(--font-sans);color:var(--text-primary);resize:vertical}" +
    ".qobs::placeholder{color:#c3c0b6!important}" +
    ".foot{margin-top:1.6rem;padding-top:1.15rem;border-top:.5px solid var(--border)}" +
    ".acts{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 0 18px}" +
    ".reset{padding:10px 16px;border-radius:var(--radius);border:.5px solid var(--border);background:var(--surface-1);color:var(--text-secondary);cursor:pointer}" +
    ".send{display:flex;align-items:center;gap:9px;font-weight:500;padding:12px 26px;border-radius:var(--radius);border:none;cursor:pointer}" +
    ".send:active{transform:scale(.98)}" +
    ".pvlab{font-size:12px;color:var(--text-muted);margin:0 0 6px}" +
    ".pv{font-family:var(--font-sans);font-size:14px;color:var(--text-primary);background:var(--surface-1);padding:12px 14px;border-radius:10px;border:1px solid var(--border-strong);white-space:pre-wrap;margin:0;line-height:1.65}";

  var st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  var E = function (s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  var D = function (o) {
    return o.desc || o.l + (o.sub ? " (" + o.sub + ")" : "");
  };

  var ff = document.createElement("div");
  ff.className = "ff";
  ff.innerHTML =
    '<p class="intro"></p><div class="qbs"></div>' +
    '<div class="foot"><textarea class="qobs gobs" rows="1" style="font-size:14px;min-height:38px;padding:8px 12px;line-height:1.5;margin:0 0 16px" placeholder="observação geral (opcional)…"></textarea>' +
    '<div class="acts">' +
    '<button class="reset" style="font-size:14px">restaurar sugestões</button>' +
    '<button class="send" style="background:#0D2C54;color:#fff;font-size:14px"><span class="sendlab">Aceitar sugestões</span> <i class="ti ti-arrow-right" aria-hidden="true"></i></button>' +
    '</div><p class="pvlab">vai cair no campo assim:</p><div class="pv"></div></div>';
  HOSPEDE.appendChild(ff);

  var q = function (sel) {
    return ff.querySelector(sel);
  };
  q(".intro").textContent = INTRO;

  QS.forEach(function (Q) {
    var b = document.createElement("div");
    b.className = "qb " + Q.mode;
    b.dataset.num = Q.n;
    b.dataset.title = Q.t;
    var h = document.createElement("div");
    h.className = "qh";
    h.innerHTML = '<span class="num">' + E(Q.n) + ")</span><span>" + E(Q.t) + "</span>";
    b.appendChild(h);
    var os = document.createElement("div");
    os.className = "opts";
    Q.opts.forEach(function (o) {
      var d = document.createElement("div");
      d.className = "opt " + Q.mode + (o.rec ? " sel" : "");
      d.dataset.code = o.c.toLowerCase();
      d.dataset.emoji = o.e;
      d.dataset.desc = D(o);
      if (o.rec) d.setAttribute("data-rec", "");
      d.innerHTML =
        '<span class="key">' + o.c + '</span><span class="oemoji">' + o.e +
        '</span><span class="lbl">' + E(o.l) +
        (o.sub ? ' <span class="sub">— ' + E(o.sub) + "</span>" : "") +
        (o.rec ? ' <span class="tag">Sugerido</span>' : "") + "</span>";
      os.appendChild(d);
    });
    b.appendChild(os);
    var i = document.createElement("textarea");
    i.className = "qobs";
    i.rows = 1;
    i.setAttribute("style", "font-size:14px;min-height:38px;padding:8px 12px;line-height:1.5");
    i.placeholder = "complemento nesta pergunta (opcional)…";
    b.appendChild(i);
    q(".qbs").appendChild(b);
  });

  function def() {
    ff.querySelectorAll(".qb").forEach(function (b) {
      b.querySelectorAll(".opt").forEach(function (o) {
        o.classList.toggle("sel", o.hasAttribute("data-rec"));
      });
    });
    ff.querySelectorAll(".qobs").forEach(function (i) {
      i.value = "";
      i.style.height = "";
    });
  }

  function build() {
    var bs = [].slice.call(ff.querySelectorAll(".qb"));
    var cu = false;
    var g = (q(".gobs").value || "").trim();
    if (g) cu = true;
    bs.forEach(function (b) {
      var s = [].slice.call(b.querySelectorAll(".opt.sel")).map(function (o) { return o.dataset.code; }).sort().join("");
      var r = [].slice.call(b.querySelectorAll(".opt[data-rec]")).map(function (o) { return o.dataset.code; }).sort().join("");
      if (s !== r) cu = true;
      if (b.querySelector(".qobs").value.trim()) cu = true;
    });
    var L = [];
    bs.forEach(function (b) {
      var s = [].slice.call(b.querySelectorAll(".opt.sel"));
      var c = b.querySelector(".qobs").value.trim();
      if (!s.length && !c) return;
      L.push(b.dataset.num + ") " + b.dataset.title);
      s.forEach(function (o) {
        L.push(o.dataset.code.toUpperCase() + " " + o.dataset.emoji + " " + o.dataset.desc);
      });
      if (c) L.push("↳ " + c);
      L.push("");
    });
    var em = !L.length && !g;
    // Cabeçalho nomeia o autor (régua "atores nomeados" do CLAUDE.md).
    // Sem AUTOR, sai sem nome — o gist público não guarda nome de pessoa.
    var cab = cu
      ? (AUTOR ? "Respostas de " + AUTOR + ":" : "Respostas:")
      : (AUTOR ? AUTOR + " aceita as sugestões:" : "Aceito as sugestões:");
    var t = em
      ? "(nenhuma pergunta respondida)"
      : cab + "\n\n" + (L.join("\n").trim() + (g ? "\n\nObs: " + g : "")).trim();
    return { text: t, cu: cu, em: em };
  }

  function ref() {
    var r = build();
    q(".pv").textContent = r.text;
    q(".sendlab").textContent = r.cu ? "Enviar seleção" : "Aceitar sugestões";
  }

  ff.addEventListener("click", function (e) {
    var o = e.target.closest(".opt");
    if (!o) return;
    var b = o.closest(".qb");
    if (b.classList.contains("single")) {
      var w = o.classList.contains("sel");
      b.querySelectorAll(".opt").forEach(function (x) { x.classList.remove("sel"); });
      if (!w) o.classList.add("sel");
    } else {
      o.classList.toggle("sel");
    }
    ref();
  });
  ff.addEventListener("input", function (e) {
    if (!e.target.classList.contains("qobs")) return;
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
    ref();
  });
  q(".reset").addEventListener("click", function () { def(); ref(); });
  q(".send").addEventListener("click", function () {
    var r = build();
    if (!r.em) sendPrompt(r.text);
  });

  def();
  ref();
  // Rede de segurança: prova que o modelo carregou E montou as perguntas.
  // Só marca OK se houve pergunta de verdade — em 13/08 o arquivo carregou
  // com a lista vazia e o aviso de falha não disparou, porque media só
  // "o arquivo chegou" em vez de "o formulário está utilizável".
  window.CC_ATALHOS_OK = QS.length > 0;
};
