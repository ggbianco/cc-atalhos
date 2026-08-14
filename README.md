# cc-atalhos

Formulário de respostas rápidas (tema navy) para widgets do Claude Code.

Sem dependências, sem rede, sem coleta de dados. O arquivo desenha um
formulário de múltipla escolha com sugestões pré-marcadas e monta um texto
legível a partir do que foi selecionado.

## Uso

```html
<div id="ccf"></div>
<script src="https://cdn.jsdelivr.net/gh/ggbianco/cc-atalhos@v2/cc-atalhos.js"></script>
<script>
  ccAtalhos({
    autor: "",               // nome de quem responde (opcional)
    intro: "…",              // linha de abertura
    qs: [                    // as perguntas
      { n: "1", t: "Pergunta?", mode: "single", opts: [
        { c: "A", e: "🚀", l: "Opção", sub: "detalhe", rec: 1 },
        { c: "B", e: "⏸️", l: "Outra" }
      ]}
    ]
  });
</script>
```

> ⚠️ O `<script src>` vem **antes** do inline que chama `ccAtalhos(...)`.
> Variável solta num `<script>` inline não vira global no ambiente de widget.

`mode`: `single` (marcador redondo) ou `multi` (quadrado). `rec: 1` marca a
opção como sugerida. Pergunta deixada sem seleção e sem complemento é omitida
do texto final.

O clique chama `sendPrompt(texto)`, função fornecida pelo ambiente do widget.

## Versões

Aponte sempre para uma etiqueta (`@v1`), nunca para o ramo principal — assim
uma mudança futura não altera formulários já publicados.
