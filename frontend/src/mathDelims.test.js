import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tablesToMarkdown, toPreviewMarkdown, toRemarkMath } from './mathDelims.js'

test('inline math', () => {
  assert.equal(toRemarkMath('dim \\(d_{k}\\) and \\(Q\\)'), 'dim $d_{k}$ and $Q$')
})

test('display math becomes a $$ block, multiline ok', () => {
  assert.equal(toRemarkMath('as:\n\\[\na = \\frac{1}{2}\n\\] (1)'), 'as:\n\n$$\na = \\frac{1}{2}\n$$\n (1)')
})

test('LaTeX line break \\\\[2pt] is not treated as display math', () => {
  const s = 'a & b \\\\[2pt] c & d'
  assert.equal(toRemarkMath(s), s)
})

test('real Nougat output', () => {
  const s = '\\[\\mathrm{Attention}(Q,K,V)=\\mathrm{softmax}(\\frac{QK^{T}}{\\sqrt{d_{k}}})V\\] (1)'
  assert.equal(
    toRemarkMath(s),
    '\n$$\n\\mathrm{Attention}(Q,K,V)=\\mathrm{softmax}(\\frac{QK^{T}}{\\sqrt{d_{k}}})V\n$$\n (1)',
  )
})

test('tabular becomes a GFM table with header, padding and math', () => {
  const s = String.raw`\begin{table}
\begin{tabular}{l c c} \hline Model & BLEU & Cost \\ \hline
Base & \(27.3\) & \(3.3\cdot 10^{18}\) \\
\multicolumn{2}{c}{Big} \\ \hline
\end{tabular}
\end{table}`
  assert.equal(
    toPreviewMarkdown(s),
    String.raw`

| Model | BLEU | Cost |
| --- | --- | --- |
| Base | $27.3$ | $3.3\cdot 10^{18}$ |
| Big |  |  |

`,
  )
})

test('caption kept as text, pipes in cells escaped', () => {
  assert.equal(
    tablesToMarkdown(String.raw`\caption{Results}
\begin{tabular}{cc}a|b & c\end{tabular}`),
    String.raw`
Results


| a\|b | c |
| --- | --- |
`,
  )
})
