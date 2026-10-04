# Apuração 2026

Dashboard independente para acompanhar a apuração das Eleições 2026 com foco em legibilidade, comparação geográfica e atualização em tempo real.

## Primeira versão

- Presidente da República
- Resultado Brasil
- Agregação por Norte, Nordeste, Centro-Oeste, Sudeste e Sul
- Detalhamento das 27 UFs
- Ranking e diferença entre candidatos
- Percentual de seções totalizadas
- Atualização automática a cada 10 segundos
- Tratamento explícito de dados parciais quando alguma UF falhar
- Interface responsiva e dark-first

## Fonte dos dados

Os dados vêm dos arquivos oficiais EA20 publicados pelo Tribunal Superior Eleitoral.

Produção 2026:

- Pleito: `3220`
- Eleição Federal: `6257`
- Ciclo: `ele2026`
- Cargo Presidente: `0001`

Exemplo de arquivo nacional usado pelo projeto:

```text
https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json
```

Para cada UF é usado o mesmo EA20 na abrangência estadual. A porcentagem regional **não** é a média dos percentuais estaduais: o projeto soma os votos brutos por candidato nas UFs da região e recalcula a participação sobre o total agregado.

Documentação oficial:

https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados

## Stack

- Next.js 16
- React 19
- TypeScript
- CSS moderno sem dependência pesada de UI
- Route Handler como camada de agregação/cache

A escolha inicial evita colocar WebGL em todas as superfícies. Plasma UI e componentes adicionais de microinteração podem entrar em pontos específicos depois de medirmos desempenho no mobile.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Arquitetura

```text
TSE EA20
  ↓
Next.js /api/results
  ↓  cache curto + normalização
Brasil + 27 UFs
  ↓
agregação regional por votos brutos
  ↓
Dashboard React
```

A rota mantém cache curto no processo e também usa o cache do `fetch` do Next, reduzindo consultas redundantes ao TSE.

## Próximos passos

1. Mapa geográfico interativo do Brasil.
2. Governador e Senador.
3. Deputados com visão própria para cargos proporcionais.
4. Municípios e zonas eleitorais sob demanda.
5. Verificação dos arquivos JWS do TSE.
6. Histórico temporal para gráfico de evolução da apuração.
7. Progressive Web App.
8. Refinamento visual com Plasma UI em superfícies selecionadas e microinterações adicionais.
