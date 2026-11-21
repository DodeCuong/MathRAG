// Nougat writes \(..\) and \[..\]; remark-math only understands $..$ and $$..$$.
// (?<!\\) skips "\\[2pt]" (LaTeX line break with spacing) inside tables.
export function toRemarkMath(mmd) {
  return mmd
    .replace(/(?<!\\)\\\[([\s\S]+?)(?<!\\)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    .replace(/(?<!\\)\\\(([\s\S]+?)(?<!\\)\\\)/g, (_, m) => `$${m}$`)
}

// Nougat emits tables as LaTeX tabular; turn them into GFM tables for the preview only.
// shortcut: \multicolumn/\multirow are flattened to their text; render real LaTeX if tables matter more.
function tabularBody(body) {
  const rows = body
    .replace(/\\(hline|toprule|midrule|bottomrule)|\\cline\{[^}]*\}/g, '')
    .split(/(?<!\\)\\\\(?:\[[^\]]*\])?/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) =>
      r
        .split(/(?<!\\)&/)
        .map((c) =>
          c
            .trim()
            .replace(/\\multi(?:column|row)\{[^}]*\}\{[^}]*\}\{([^}]*)\}/g, '$1')
            .replace(/\|/g, '\\|'),
        ),
    )
  if (!rows.length) return ''
  const width = Math.max(...rows.map((r) => r.length))
  const line = (cells) => `| ${[...cells, ...Array(width - cells.length).fill('')].join(' | ')} |`
  return ['', line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line), ''].join('\n')
}

export function tablesToMarkdown(mmd) {
  return mmd
    .replace(/\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g, (_, body) => tabularBody(body))
    .replace(/\\begin\{table\*?\}(\[[^\]]*\])?|\\end\{table\*?\}|\\centering/g, '')
    .replace(/\\caption\{([^}]*)\}/g, '\n$1\n')
}

export const toPreviewMarkdown = (mmd) => toRemarkMath(tablesToMarkdown(mmd))
