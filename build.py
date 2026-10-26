#!/usr/bin/env python3
"""Assemble Spectator's index.html from the files in src/.

Run from the repository folder:   python3 build.py
Edit the files in src/, never index.html directly: it is overwritten.
"""
import json, pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
JS_ORDER = ["config.js", "core.js", "decoder.js", "export.js", "themes.js", "ui.js"]

def read(p): return (SRC / p).read_text(encoding="utf-8")

schema = json.loads(read("data/brush-schema.json"))
js = "const PARAM_SCHEMA = " + json.dumps(schema, ensure_ascii=False, separators=(",", ":")) + ";\n"
js += read("data/colour-libs.js") + "\n"
js += "\n".join(read("js/" + f) for f in JS_ORDER)

# Validate the JavaScript before writing anything.
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t:
    t.write(js); tmp = t.name
try:
    r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("JavaScript error, index.html not written:\n" + r.stderr)
except FileNotFoundError:
    print("note: Node.js not found, skipped the JavaScript syntax check")

html = read("template.html")
for key, val in {"/*__CSS__*/": read("styles.css") + read("export.css"),
                 "<!--__BODY__-->": read("body-main.html") + read("body-export.html"),
                 "/*__JS__*/": js}.items():
    assert key in html, key
    html = html.replace(key, val)
(ROOT / "index.html").write_text(html, encoding="utf-8")
print(f"index.html written ({len(html):,} bytes)")
