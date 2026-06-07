# Design System — Inácio Arruda

**Versão:** 0.1  
**Data:** 2026-06-06  
**Escopo:** extração visual e editorial do site público `inacio.com.br` e dos assets públicos de campanha vinculados ao site.

> **Nota de precisão:** este documento consolida tokens e padrões observados no front-end público e em imagens oficiais hospedadas no próprio site. As cores foram amostradas dos arquivos de imagem públicos. Tipografia, grid e estados interativos foram normalizados como recomendações de implementação porque o sistema visual observado não está documentado como biblioteca formal no site.

---

## 1. Fontes analisadas

- Home: `https://inacio.com.br/`
- Página Manifesto: `https://inacio.com.br/manifesto/`
- Barra de cores: `https://inacio.com.br/wp-content/uploads/2022/07/barra-de-cores01.jpg`
- Banner Instagram/campanha: `https://inacio.com.br/wp-content/uploads/2022/08/Banner-InacioInsta03.jpg`
- Banner Manifesto: `https://inacio.com.br/wp-content/uploads/2022/08/banner-manifesto02-1024x320.jpg`
- Cards temáticos:
  - Trabalhadoras: `https://inacio.com.br/wp-content/uploads/2022/08/trabalhadoras-576x1024.jpeg`
  - Mulheres: `https://inacio.com.br/wp-content/uploads/2022/08/mulheres-575x1024.jpeg`
  - Juventude: `https://inacio.com.br/wp-content/uploads/2022/08/juventude-576x1024.jpeg`
  - Cultura: `https://inacio.com.br/wp-content/uploads/2022/08/cultura-576x1024.jpeg`
  - Ciência, Tecnologia e Educação: `https://inacio.com.br/wp-content/uploads/2022/08/cet-576x1024.jpeg`

---

## 2. Personalidade visual

A marca combina linguagem de campanha política, símbolos nacionais e comunicação popular. O sistema é construído sobre quatro pilares:

1. **Brasil/Ceará como imaginário visual**  
   Verde, amarelo, azul e vermelho aparecem como núcleo cromático. A composição remete a bandeira, democracia, povo e território.

2. **Otimismo e mobilização**  
   Frases curtas, verbos de ação e chamadas coletivas: “Junte-se”, “Vamos juntos”, “Pro povo voltar a ser feliz”.

3. **Clareza popular**  
   Conteúdo direto, centralizado, em letras grandes e alto contraste. A informação é organizada em blocos e listas de conquistas.

4. **Sistema modular por tema**  
   Cards verticais usam fundos sólidos por assunto: mulheres, juventude, cultura, trabalhadoras, ciência/tecnologia/educação.

---

## 3. Marca e assinatura

### 3.1 Logotipo

**Forma principal:** wordmark `INÁCIO` em caixa alta, multicolorido, com acento gráfico destacado.  
**Assinaturas observadas:**

- `INÁCIO`
- `INÁCIO Federal`
- `INÁCIO Deputado Federal`

### 3.2 Regras de aplicação

- Usar preferencialmente sobre fundo branco, off-white ou fundos sólidos com contraste alto.
- Preservar o desenho multicolorido do wordmark.
- Em fundos coloridos, usar versão branca quando o contraste do logotipo multicolorido for insuficiente.
- Manter respiro mínimo equivalente à altura do acento de `Á` ao redor do logotipo.
- Não aplicar sombras pesadas, gradientes ou contornos extras no logotipo.

---

## 4. Paleta de cores

### 4.1 Paleta institucional principal

Cores amostradas da barra oficial de cores do site.

| Token | Hex | Uso recomendado |
|---|---:|---|
| `--ia-red-500` | `#E33431` | Energia, urgência, chamadas, blocos de destaque |
| `--ia-yellow-500` | `#FAD549` | Otimismo, destaque, fundos de apoio |
| `--ia-green-500` | `#4DAA35` | Identidade nacional, cultura, esperança |
| `--ia-blue-500` | `#2171BA` | Confiança, botões, navegação, títulos |

### 4.2 Cores do logotipo

Cores amostradas do banner manifesto e do wordmark.

| Token | Hex | Uso recomendado |
|---|---:|---|
| `--ia-logo-red` | `#ED1C22` | Letra/fragmento vermelho da marca |
| `--ia-logo-yellow` | `#FDD303` | Letra/fragmento amarelo da marca |
| `--ia-logo-green` | `#3AB54A` | Letra/fragmento verde da marca |
| `--ia-logo-cyan` | `#027AC3` | Letra/fragmento azul/ciano da marca |

### 4.3 Paleta temática dos cards

| Tema | Token | Hex | Texto recomendado |
|---|---|---:|---|
| Trabalhadoras | `--ia-theme-workers` | `#7A3F8F` | Branco |
| Mulheres | `--ia-theme-women` | `#FEBA0F` | Azul escuro |
| Juventude | `--ia-theme-youth` | `#399BD8` | Branco em textos grandes; preferir azul/ink para texto pequeno |
| Cultura | `--ia-theme-culture` | `#3A8E36` | Branco em textos grandes; preferir ink para texto pequeno |
| Ciência/Tecnologia/Educação | `--ia-theme-science` | `#315DA6` | Branco |

### 4.4 Neutros

| Token | Hex | Uso recomendado |
|---|---:|---|
| `--ia-white` | `#FFFFFF` | Fundo, cards, texto sobre fundos escuros |
| `--ia-offwhite` | `#F1F2F4` | Fundo pontilhado, áreas amplas |
| `--ia-gray-200` | `#D4DFE2` | Pontilhado, linhas suaves, divisores |
| `--ia-ink` | `#1D1D1F` | Texto principal em fundos claros |
| `--ia-muted` | `#5F6368` | Texto secundário |

### 4.5 Combinações acessíveis

Contraste aproximado calculado sobre as cores amostradas.

| Fundo | Texto | Contraste aprox. | Recomendação |
|---|---|---:|---|
| `#2171BA` | Branco | 5.08:1 | Aprovado para texto normal |
| `#315DA6` | Branco | 6.47:1 | Aprovado para texto normal |
| `#7A3F8F` | Branco | 7.15:1 | Aprovado para texto normal |
| `#FAD549` | `#1D1D1F` | 11.76:1 | Aprovado |
| `#FAD549` | `#315DA6` | 4.52:1 | Aprovado no limite |
| `#E33431` | Branco | 4.37:1 | Usar em texto grande/semibold; escurecer para texto pequeno |
| `#4DAA35` | Branco | 2.95:1 | Usar só em texto grande decorativo; para texto pequeno usar ink |
| `#399BD8` | Branco | 3.06:1 | Usar só em texto grande decorativo; para texto pequeno usar ink |

---

## 5. Tokens CSS recomendados

```css
:root {
  /* Brand */
  --ia-red-500: #E33431;
  --ia-yellow-500: #FAD549;
  --ia-green-500: #4DAA35;
  --ia-blue-500: #2171BA;

  /* Logo */
  --ia-logo-red: #ED1C22;
  --ia-logo-yellow: #FDD303;
  --ia-logo-green: #3AB54A;
  --ia-logo-cyan: #027AC3;

  /* Themes */
  --ia-theme-workers: #7A3F8F;
  --ia-theme-women: #FEBA0F;
  --ia-theme-youth: #399BD8;
  --ia-theme-culture: #3A8E36;
  --ia-theme-science: #315DA6;

  /* Neutrals */
  --ia-white: #FFFFFF;
  --ia-offwhite: #F1F2F4;
  --ia-gray-200: #D4DFE2;
  --ia-ink: #1D1D1F;
  --ia-muted: #5F6368;

  /* Typography */
  --ia-font-display: "Montserrat", "Poppins", "Arial Black", system-ui, sans-serif;
  --ia-font-body: "Montserrat", "Inter", Arial, system-ui, sans-serif;

  /* Layout */
  --ia-container: 1120px;
  --ia-section-y: 96px;
  --ia-section-y-mobile: 56px;

  /* Spacing scale */
  --ia-space-1: 4px;
  --ia-space-2: 8px;
  --ia-space-3: 12px;
  --ia-space-4: 16px;
  --ia-space-5: 24px;
  --ia-space-6: 32px;
  --ia-space-7: 48px;
  --ia-space-8: 64px;
  --ia-space-9: 96px;

  /* Radius */
  --ia-radius-sm: 4px;
  --ia-radius-md: 8px;
  --ia-radius-lg: 16px;
  --ia-radius-pill: 999px;

  /* Shadow */
  --ia-shadow-card: 0 8px 24px rgb(0 0 0 / 0.12);
}
```

---

## 6. Tipografia

### 6.1 Direção tipográfica

A comunicação visual dos cards e banners usa uma sans serif geométrica, em caixa alta, com peso alto e espaçamento controlado. A aparência é próxima de **Montserrat**, **Poppins** ou família equivalente.

**Recomendação para implementação:**

- Display: `Montserrat ExtraBold/Black`
- Body: `Montserrat Regular/SemiBold` ou `Inter`
- Fallback: `Arial`, `system-ui`, `sans-serif`

### 6.2 Escala web

| Papel | Desktop | Mobile | Peso | Uso |
|---|---:|---:|---:|---|
| Hero | 64/72 | 40/48 | 800–900 | Frases principais |
| H1 | 56/64 | 36/44 | 800 | Títulos de página |
| H2 | 40/48 | 30/38 | 800 | Seções |
| H3 | 28/36 | 24/32 | 700 | Cards e blocos |
| Body | 18/30 | 16/26 | 400 | Parágrafos |
| Body strong | 18/30 | 16/26 | 700 | Ênfase |
| Small | 14/20 | 13/18 | 500 | Legendas, metadados |
| CTA | 16/20 | 16/20 | 700 | Botões |

### 6.3 Escala para cards sociais

| Elemento | Tamanho sugerido | Peso | Observação |
|---|---:|---:|---|
| Tema outline grande | 72–120 px | 900 | Caixa alta, contorno, opacidade baixa |
| Texto principal | 32–48 px | 500–700 | Caixa alta, centralizado |
| Logo inferior | 64–120 px largura | 800–900 | Preferir versão branca ou colorida conforme fundo |
| Ícone check | 40–56 px | — | Dentro de círculo branco ou azul |

---

## 7. Layout e grid

### 7.1 Container

- Largura máxima recomendada: `1120px`.
- Padding lateral desktop: `32px`.
- Padding lateral mobile: `20px`.
- Grid desktop: 12 colunas.
- Grid tablet: 8 colunas.
- Grid mobile: 4 colunas.

### 7.2 Espaçamento

- Seções principais: `96px` vertical no desktop, `56px` no mobile.
- Blocos internos: `32px` a `48px`.
- Distância entre título e conteúdo: `24px`.
- Cards em grid: gap `24px` desktop, `16px` mobile.

### 7.3 Fundos e texturas

Padrão recorrente:

- Fundo branco/off-white.
- Pontilhado cinza claro para profundidade.
- Barras horizontais coloridas em blocos iguais.
- Fotografia recortada sobre fundo claro.
- Grandes palavras em contorno como textura editorial.

---

## 8. Componentes

### 8.1 Barra de cores

**Descrição:** faixa horizontal com quatro blocos iguais: vermelho, amarelo, verde e azul.  
**Uso:** separador de seções, assinatura visual, topo/rodapé de materiais.

```css
.ia-color-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: 8px;
}

.ia-color-bar > :nth-child(1) { background: var(--ia-red-500); }
.ia-color-bar > :nth-child(2) { background: var(--ia-yellow-500); }
.ia-color-bar > :nth-child(3) { background: var(--ia-green-500); }
.ia-color-bar > :nth-child(4) { background: var(--ia-blue-500); }
```

### 8.2 Header / navegação

**Estrutura recomendada:**

- Logotipo à esquerda.
- Navegação horizontal no desktop.
- Botão/CTA destacado à direita quando houver campanha ativa.
- Menu colapsado no mobile.

**Estilo:**

- Fundo branco.
- Texto em `--ia-ink`.
- Link ativo em `--ia-blue-500`.
- Hover com sublinhado ou troca para azul.
- Altura mínima: `72px`.

### 8.3 Hero/banner

**Padrão observado:** logo/frase forte à esquerda, fotografia ou retrato à direita, fundo claro com pontilhado e blocos de cor.

**Regras:**

- Priorizar uma mensagem curta.
- Manter contraste alto.
- Evitar excesso de texto no hero.
- Usar proporção ampla em páginas: 16:5, 3:1 ou 16:6.
- Em mobile, empilhar: texto/logotipo primeiro, imagem depois.

### 8.4 Seção editorial

Usada para blocos como “Biografia” e “Quem é Inácio”.

```html
<section class="ia-section">
  <p class="ia-eyebrow">Biografia</p>
  <h2>Quem é Inácio</h2>
  <p>Texto introdutório...</p>
  <a class="ia-link" href="#">leia mais</a>
</section>
```

**Direção visual:**

- Eyebrow em caixa alta ou capitalizado.
- H2 forte, azul ou ink.
- Parágrafo com leitura confortável.
- Link textual simples para continuidade.

### 8.5 Abas de atuação parlamentar

**Padrão de conteúdo:** Vereador, Deputado Estadual, Deputado Federal, Senador.

**Regras:**

- Usar labels curtas.
- Indicar estado ativo com azul ou fundo claro.
- Em mobile, usar carrossel horizontal ou accordion.
- Conteúdo em listas com bullets/checks.

### 8.6 Botões

#### Primário azul

```css
.ia-button-primary {
  background: var(--ia-blue-500);
  color: var(--ia-white);
  border-radius: var(--ia-radius-pill);
  padding: 14px 24px;
  font-weight: 700;
  text-decoration: none;
}
```

**Uso:** CTAs principais, como assinatura de manifesto e navegação para páginas-chave.

#### Secundário amarelo

```css
.ia-button-secondary {
  background: var(--ia-yellow-500);
  color: var(--ia-ink);
  border-radius: var(--ia-radius-pill);
  padding: 14px 24px;
  font-weight: 800;
}
```

**Uso:** chamadas otimistas, cards e blocos promocionais.

#### CTA vermelho

```css
.ia-button-alert {
  background: var(--ia-red-500);
  color: var(--ia-white);
  border-radius: var(--ia-radius-pill);
  padding: 14px 24px;
  font-weight: 800;
}
```

**Observação:** usar texto semibold/grande; para textos pequenos, escurecer o vermelho para garantir contraste AA.

### 8.7 Card temático vertical

**Formato:** 9:16, pensado para redes sociais.

**Estrutura:**

1. Palavra-tema em contorno no topo.
2. Lista central de conquistas/propostas.
3. Ícones de check em círculos.
4. Logotipo na base.
5. Palavra-tema em contorno no rodapé.

```html
<article class="ia-social-card ia-social-card--workers">
  <span class="ia-social-card__outline ia-social-card__outline--top">TRABALHADORAS</span>
  <div class="ia-social-card__content">
    <div class="ia-check">✓</div>
    <p>Foi autor da proposta que reduz a jornada de trabalho para 40 horas semanais.</p>
    <div class="ia-check">✓</div>
    <p>Emprego, renda e comida no prato.</p>
  </div>
  <img class="ia-social-card__logo" src="logo-inacio-white.svg" alt="Inácio Deputado Federal">
</article>
```

```css
.ia-social-card {
  position: relative;
  aspect-ratio: 9 / 16;
  padding: 56px 40px;
  overflow: hidden;
  color: var(--ia-white);
  font-family: var(--ia-font-display);
  text-align: center;
}

.ia-social-card--workers { background: var(--ia-theme-workers); }
.ia-social-card--women {
  background: var(--ia-theme-women);
  color: var(--ia-theme-science);
}

.ia-social-card__outline {
  position: absolute;
  left: 0;
  right: 0;
  font-size: clamp(56px, 12vw, 112px);
  font-weight: 900;
  line-height: 0.9;
  color: transparent;
  -webkit-text-stroke: 1px currentColor;
  opacity: 0.22;
}

.ia-social-card__outline--top { top: 0; }
.ia-social-card__content {
  display: grid;
  gap: 28px;
  place-items: center;
  min-height: 70%;
}

.ia-social-card p {
  margin: 0;
  max-width: 720px;
  font-size: clamp(28px, 5vw, 44px);
  line-height: 1.16;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ia-check {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border-radius: 999px;
  background: var(--ia-white);
  color: currentColor;
  font-size: 44px;
  font-weight: 900;
}
```

### 8.8 Manifesto CTA

**Função:** mobilizar assinatura/apoio.

**Direção:**

- Título forte.
- Texto curto e coletivo.
- Botão primário destacado.
- Visual com fundo claro, logo e fotografia.

**Copy model:**

- Título: “Manifesto por Inácio Arruda”
- Chamada: “Junte-se a nós.”
- CTA: “Assinar Manifesto”

### 8.9 Bloco de contato

**Estrutura:**

- Título `Contato`.
- E-mail em link clicável.
- Opcional: redes sociais e telefone.

**Estilo:**

- Fundo claro.
- Texto direto.
- Ícones em azul.
- Link com hover sublinhado.

---

## 9. Ícones e ilustrações

### 9.1 Check icon

Ícone principal nos cards temáticos.

- Forma: check simples.
- Container: círculo branco.
- Tamanho: 56–96 px conforme peça.
- Cor do check: herda a cor do fundo ou usa azul escuro no tema amarelo.

### 9.2 Ícones editoriais

Para seções de atuação parlamentar, usar ícones lineares simples:

- Câmara/mandato.
- Documento/lei.
- Pessoas/comunidade.
- Educação/cultura.
- Meio ambiente/ciência.

**Estilo:** traço regular, cantos arredondados, sem detalhes excessivos.

---

## 10. Fotografia

### 10.1 Direção

- Retratos com luz clara e expressão próxima.
- Composição frontal ou 3/4.
- Gestos de mobilização podem ser usados, como punho levantado.
- Preferir recorte do personagem sobre fundos limpos.
- Manter espaço para texto e logotipo.

### 10.2 Tratamento

- Fundo branco/off-white.
- Pontilhado sutil.
- Blocos de cor como moldura.
- Evitar filtros pesados.
- Usar contraste e nitidez suficientes para mobile.

---

## 11. Padrões de conteúdo

### 11.1 Tom de voz

- Popular.
- Direto.
- Coletivo.
- Esperançoso.
- Propositivo.
- Democrático.

### 11.2 Vocabulário recorrente

- Povo
- Ceará
- Brasil
- Democracia
- Desenvolvimento
- Direitos
- Educação
- Cultura
- Ciência
- Juventude
- Mulheres
- Trabalhadoras/trabalhadores
- Vamos juntos
- Junte-se

### 11.3 Estrutura de mensagens

Usar frases curtas e com ação clara.

**Modelo para cards:**

```text
[TEMA]

✓ FOI AUTOR / GARANTIU / DEFENDE
[CONQUISTA OU PROPOSTA]

✓ INÁCIO VAI ATUAR PARA
[OBJETIVO POPULAR]
```

**Modelo para CTA:**

```text
Junte-se a nós!
[Frase de mobilização]
[Botão de ação]
```

---

## 12. Estados de interação

### 12.1 Links

- Estado padrão: azul.
- Hover: sublinhado + azul escurecido.
- Focus: outline visível com `--ia-yellow-500` ou `--ia-blue-500`.

```css
a {
  color: var(--ia-blue-500);
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.18em;
}

a:hover {
  color: #185B96;
}

a:focus-visible {
  outline: 3px solid var(--ia-yellow-500);
  outline-offset: 3px;
}
```

### 12.2 Botões

- Hover: escurecer 8–12%.
- Active: reduzir leve escala ou sombra.
- Disabled: cinza claro + cursor padrão.
- Focus visible sempre obrigatório.

---

## 13. Acessibilidade

- Não usar cor como único indicador de estado.
- Garantir contraste mínimo AA em texto normal.
- Para verde claro e azul claro com texto branco, usar apenas texto grande/decorativo ou escurecer a cor.
- Botões com área clicável mínima de `44px`.
- Alt text descritivo em banners, cards e retratos.
- Evitar parágrafos longos em caixa alta; reservar caixa alta para títulos, cards e CTAs.
- Em cards sociais, manter texto central com no máximo 3–4 linhas por bloco.
- Para navegação mobile, garantir ordem de foco lógica.

---

## 14. Do / Don’t

### Do

- Usar blocos de cor sólidos.
- Usar frases curtas e fortes.
- Combinar branco/off-white com cores nacionais.
- Usar logotipo com respiro.
- Repetir a barra de cores como assinatura.
- Criar variações temáticas por público/assunto.

### Don’t

- Não aplicar gradientes complexos na paleta principal.
- Não distorcer o logotipo.
- Não usar amarelo com texto branco em UI.
- Não usar verde claro com texto branco em texto pequeno.
- Não sobrecarregar banners com textos longos.
- Não misturar muitas famílias tipográficas.

---

## 15. Checklist de implementação

- [ ] Criar tokens CSS globais.
- [ ] Configurar tipografia display/body.
- [ ] Implementar barra de cores.
- [ ] Criar componentes: Header, Hero, Section, CTA, Button, ThematicCard.
- [ ] Validar contraste dos botões e cards.
- [ ] Definir versões do logotipo: colorida e branca.
- [ ] Padronizar imagens com fundo claro/pontilhado.
- [ ] Criar templates de card social por tema.
- [ ] Documentar exemplos de copy para site e redes.
- [ ] Testar responsividade em 360px, 768px, 1024px e 1440px.

---

## 16. Exemplo mínimo de estrutura de página

```html
<header class="ia-header">
  <a class="ia-logo" href="/">INÁCIO</a>
  <nav class="ia-nav">
    <a href="#biografia">Biografia</a>
    <a href="#atuacao">Atuação Parlamentar</a>
    <a href="/manifesto/">Manifesto</a>
    <a href="#contato">Contato</a>
  </nav>
</header>

<div class="ia-color-bar">
  <span></span><span></span><span></span><span></span>
</div>

<main>
  <section class="ia-hero">
    <div>
      <p class="ia-eyebrow">Manifesto</p>
      <h1>O futuro começa agora</h1>
      <p>Vamos juntos pelo Ceará e pelo Brasil.</p>
      <a class="ia-button-primary" href="/manifesto/">Assinar Manifesto</a>
    </div>
  </section>

  <section id="biografia" class="ia-section">
    <p class="ia-eyebrow">Biografia</p>
    <h2>Quem é Inácio</h2>
    <p>Texto introdutório sobre trajetória pública e atuação popular.</p>
    <a class="ia-link" href="#">leia mais</a>
  </section>
</main>
```

---

## 17. Resumo executivo

O design system de `inacio.com.br` é um sistema de campanha com base em cores nacionais, linguagem popular e componentes simples. A força visual está na repetição de quatro elementos: logotipo multicolorido, barra vermelho/amarelo/verde/azul, fundos sólidos temáticos e tipografia geométrica em caixa alta. Para evoluir esse sistema em produto digital, a prioridade deve ser transformar esses padrões em tokens reutilizáveis, melhorar contraste em combinações críticas e criar componentes responsivos para site, manifesto e redes sociais.
