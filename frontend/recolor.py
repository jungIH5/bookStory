import re
import pathlib

ROOT = pathlib.Path(__file__).parent / "src"

# hex -> hex (old warm brown/gold/cream theme -> new pastel purple/navy theme)
HEX_MAP = {
    "8C6B42": "6C5CE7",  # primary: brown -> purple
    "C49456": "A78BFA",  # secondary: gold -> lavender
    "1C140E": "241B45",  # text dark
    "9E8D7A": "8F87B8",  # muted text
    "7B6B55": "6E67A0",  # muted text (darker variant)
    "5C4F42": "6E67A0",
    "5C4F40": "6E67A0",
    "5A4A3A": "574C8C",
    "BDB0A0": "C7C2E0",  # placeholder / lightest muted
    "FEFCF9": "FDFCFF",  # card surface
    "F7F4EF": "F7F5FF",  # page background
    "EDE8E2": "E9E5F7",  # light neutral placeholder bg
    "A07840": "5849C4",  # darker primary hover variant
    "3D2D1E": "3A3070",  # dark brown modal header shade
    "3D2410": "332A5C",
    "2C1A0E": "1E1838",  # darkest modal header start
    "241A11": "1B1533",
    "2C1A10": "241B45",  # bookshelf case
    "3d1a00": "2D2456",  # bookshelf shelf gradient top
    "1a0900": "150F2B",  # bookshelf shelf gradient bottom
    "faf8f5": "F7F5FD",
    "f5f0eb": "EFEBFA",
    "ede8e1": "E3DFF5",
    "ddd5c8": "D6CFF0",
}

# decimal RGB triplet -> triplet (for rgba(...) usages of the same colors above)
RGB_MAP = {
    (139, 107, 66): (108, 92, 231),
    (140, 107, 66): (108, 92, 231),
    (196, 148, 86): (167, 139, 250),
    (28, 20, 14): (36, 27, 69),
    (158, 141, 122): (143, 135, 184),
    (189, 176, 160): (199, 194, 224),
    (247, 244, 239): (247, 245, 255),
    (44, 26, 16): (36, 27, 69),
    (120, 100, 80): (110, 103, 160),
}

HEX_RE = re.compile(r"#([0-9A-Fa-f]{6})\b")
RGB_RE = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)")


def sub_hex(m):
    code = m.group(1)
    new = HEX_MAP.get(code) or HEX_MAP.get(code.upper()) or HEX_MAP.get(code.lower())
    return f"#{new}" if new else m.group(0)


def sub_rgb(m):
    triplet = (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    new = RGB_MAP.get(triplet)
    if not new:
        return m.group(0)
    prefix = m.group(0).split("(")[0]
    return f"{prefix}({new[0]}, {new[1]}, {new[2]}"


changed_files = []
for path in ROOT.rglob("*"):
    if path.suffix not in (".jsx", ".js", ".css"):
        continue
    text = path.read_text(encoding="utf-8")
    new_text = HEX_RE.sub(sub_hex, text)
    new_text = RGB_RE.sub(sub_rgb, new_text)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        changed_files.append(str(path.relative_to(ROOT)))

print(f"Changed {len(changed_files)} files:")
for f in changed_files:
    print(" -", f)
