import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.tex import mmd_to_tex  # noqa: E402


def body(mmd):
    tex = mmd_to_tex(mmd)
    assert tex.startswith(r"\documentclass{article}") and tex.endswith("\\end{document}\n")
    return tex.split("\\begin{document}\n", 1)[1].rsplit("\n\\end{document}", 1)[0]


def test_headings():
    assert body("# Title\n## 1 Intro\n### 1.1 A\n#### 1.1.1 B") == (
        "\\section*{Title}\n\\section*{1 Intro}\n\\subsection*{1.1 A}\n\\subsubsection*{1.1.1 B}"
    )


def test_math_kept_verbatim():
    mmd = r"Let \(x_1 + y^2\) and \[\frac{a}{b} \% 50\] and $a_b$"
    assert body(mmd) == mmd


def test_multiline_display_math_and_env():
    mmd = "\\[\na_1\n\\]\n\\begin{tabular}{c c}\na & b \\\\\n\\end{tabular}"
    assert body(mmd) == mmd


def test_text_escaped():
    assert body("50% of A & B cost #1, snake_case") == r"50\% of A \& B cost \#1, snake\_case"


def test_bold_italic():
    assert body("**bold** and *it* and _it2_") == r"\textbf{bold} and \textit{it} and \textit{it2}"


def test_lists():
    assert body("* a\n* b \\(x\\)\ntext\n1. one\n2. two") == (
        "\\begin{itemize}\n\\item a\n\\item b \\(x\\)\n\\end{itemize}\ntext\n"
        "\\begin{enumerate}\n\\item one\n\\item two\n\\end{enumerate}"
    )


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
    print("all tex tests passed")
