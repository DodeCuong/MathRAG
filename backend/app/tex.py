"""mmd (Nougat output) -> .tex for download. Owner: Bạn."""
import re

# Math and LaTeX environments are copied verbatim; only the text between them is converted.
_PROTECTED = re.compile(
    r"\\\[.*?\\\]|\\\(.*?\\\)|\$\$.*?\$\$|\$[^$\n]+?\$|\\begin\{(\w+\*?)\}.*?\\end\{\1\}",
    re.DOTALL,
)
# Nougat uses # for the title, ## for sections, #### for x.y.z (verified on arXiv output).
_HEADINGS = ["section", "section", "subsection", "subsubsection", "paragraph", "paragraph"]
_ESCAPES = {
    "\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#",
    "_": r"\_", "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}",
}
# Placeholders survive escaping because they use control chars, not LaTeX specials.
_BOLD, _ITALIC, _END = "\x01", "\x02", "\x03"

PREAMBLE = r"""\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath,amssymb}
\begin{document}
"""


def _inline(text):
    text = re.sub(r"\*\*(.+?)\*\*", _BOLD + r"\1" + _END, text)
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", _ITALIC + r"\1" + _END, text)
    text = re.sub(r"(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)", _ITALIC + r"\1" + _END, text)
    text = "".join(_ESCAPES.get(c, c) for c in text)
    return text.replace(_BOLD, r"\textbf{").replace(_ITALIC, r"\textit{").replace(_END, "}")


def mmd_to_tex(mmd):
    protected = []

    def stash(m):
        protected.append(m.group(0))
        return f"\x00{len(protected) - 1}\x00"

    body = _PROTECTED.sub(stash, mmd)

    out, open_list = [], None
    for line in body.split("\n"):
        heading = re.match(r"^(#{1,6})\s+(.*)$", line)
        bullet = re.match(r"^\s*[*-]\s+(.*)$", line)
        number = re.match(r"^\s*\d+[.)]\s+(.*)$", line)
        item_env = "itemize" if bullet else "enumerate" if number else None

        if open_list and open_list != item_env:
            out.append(rf"\end{{{open_list}}}")
            open_list = None
        if item_env and not open_list:
            out.append(rf"\begin{{{item_env}}}")
            open_list = item_env

        if heading:
            cmd = _HEADINGS[len(heading.group(1)) - 1]
            out.append(rf"\{cmd}*{{{_inline(heading.group(2))}}}")
        elif item_env:
            out.append(r"\item " + _inline((bullet or number).group(1)))
        else:
            out.append(_inline(line))
    if open_list:
        out.append(rf"\end{{{open_list}}}")

    body = re.sub("\x00(\\d+)\x00", lambda m: protected[int(m.group(1))], "\n".join(out))
    return PREAMBLE + body.strip() + "\n\\end{document}\n"
