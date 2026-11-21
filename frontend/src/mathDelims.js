// Nougat writes \(..\) and \[..\]; remark-math only understands $..$ and $$..$$.
// (?<!\\) skips "\\[2pt]" (LaTeX line break with spacing) inside tables.
export function toRemarkMath(mmd) {
  return mmd
    .replace(/(?<!\\)\\\[([\s\S]+?)(?<!\\)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    .replace(/(?<!\\)\\\(([\s\S]+?)(?<!\\)\\\)/g, (_, m) => `$${m}$`)
}
