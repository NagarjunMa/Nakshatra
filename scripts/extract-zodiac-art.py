"""Extract the licensed four-sign Illustrator/PDF sheets into transparent SVG assets."""

from __future__ import annotations

import html
from pathlib import Path

from pypdf import PdfReader
from pypdf.generic import ContentStream

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "zodiac"

SHEETS = [
    (
        Path(r"C:\Users\Lenovo\Downloads\hand-drawn-zodiac-sign-collection (1)\5536304.ai"),
        ("mesha", "vrishabha", "mithuna", "karka"),
    ),
    (
        Path(r"C:\Users\Lenovo\Downloads\hand-drawn-zodiac-sign-collection (1) (1)\5536308.ai"),
        ("simha", "kanya", "tula", "vrishchika"),
    ),
    (
        Path(r"C:\Users\Lenovo\Downloads\hand-drawn-zodiac-sign-collection\5536314.ai"),
        ("dhanu", "kumbha", "makara", "meena"),
    ),
]

# PDF-coordinate crops: top-left, top-right, bottom-left, bottom-right.
CROPS = (
    (30, 270, 360, 180),
    (390, 270, 360, 165),
    (30, 45, 365, 185),
    (390, 45, 360, 185),
)

DARK_COLORS = {
    (0.035, 0.455, 0.561): "#579ba8",
    (0.047, 0.592, 0.729): "#7db7b3",
    (0.78, 0.639, 0.345): "#d1b475",
    (0.859, 0.761, 0.557): "#e4c98e",
}


def number(value: object) -> str:
    return f"{float(value):.4f}".rstrip("0").rstrip(".")


def rgb(values: tuple[float, float, float], dark: bool) -> str:
    rounded = tuple(round(value, 3) for value in values)
    if dark and rounded in DARK_COLORS:
        return DARK_COLORS[rounded]
    return "#" + "".join(f"{round(max(0, min(1, value)) * 255):02x}" for value in values)


def svg_body(path: Path, dark: bool) -> str:
    page = PdfReader(str(path)).pages[0]
    stream = ContentStream(page.get_contents(), page.pdf)
    fragments: list[str] = []
    group_counts = [0]
    color_stack = ["#000000"]
    current_color = "#000000"
    commands: list[str] = []
    pending_clip = False
    clip_index = 0

    for operands, raw_operator in stream.operations:
        operator = raw_operator.decode("ascii")
        if operator == "q":
            fragments.append("<g>")
            group_counts.append(0)
            color_stack.append(current_color)
        elif operator == "Q":
            fragments.extend("</g>" for _ in range(group_counts.pop()))
            fragments.append("</g>")
            current_color = color_stack.pop()
        elif operator == "cm":
            matrix = " ".join(number(value) for value in operands)
            fragments.append(f'<g transform="matrix({matrix})">')
            group_counts[-1] += 1
        elif operator == "g":
            shade = float(operands[0])
            current_color = rgb((shade, shade, shade), dark)
        elif operator == "scn" and len(operands) >= 3:
            current_color = rgb(tuple(float(value) for value in operands[:3]), dark)
        elif operator == "m":
            commands.append(f"M {number(operands[0])} {number(operands[1])}")
        elif operator == "l":
            commands.append(f"L {number(operands[0])} {number(operands[1])}")
        elif operator == "c":
            commands.append("C " + " ".join(number(value) for value in operands))
        elif operator == "v":
            commands.append("S " + " ".join(number(value) for value in operands))
        elif operator == "y":
            commands.append("Q " + " ".join(number(value) for value in operands))
        elif operator == "h":
            commands.append("Z")
        elif operator == "re":
            x, y, width, height = (number(value) for value in operands)
            commands.append(f"M {x} {y} h {width} v {height} h -{width} Z")
        elif operator in {"W", "W*"}:
            pending_clip = True
        elif operator in {"f", "F", "f*"}:
            if commands and current_color != "#ffffff":
                fill_rule = ' fill-rule="evenodd"' if operator == "f*" else ""
                path_data = html.escape(" ".join(commands), quote=True)
                fragments.append(f'<path d="{path_data}" fill="{current_color}"{fill_rule}/>')
            commands = []
        elif operator == "n":
            if pending_clip and commands:
                clip_index += 1
                path_data = html.escape(" ".join(commands), quote=True)
                fragments.append(
                    f'<clipPath id="clip-{clip_index}"><path d="{path_data}"/></clipPath>'
                    f'<g clip-path="url(#clip-{clip_index})">'
                )
                group_counts[-1] += 1
            commands = []
            pending_clip = False

    fragments.extend("</g>" for _ in range(group_counts[0]))
    return "".join(fragments)


def write_asset(name: str, body: str, crop: tuple[int, int, int, int], dark: bool) -> None:
    x, y, width, height = crop
    svg_y = 500 - y - height
    variant = "dark" if dark else "light"
    markup = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {svg_y} {width} {height}" '
        f'role="img" aria-labelledby="title"><title id="title">{name} zodiac wordmark</title>'
        f'<g transform="translate(0 500) scale(1 -1)">{body}</g></svg>'
    )
    (OUTPUT / f"{name}-{variant}.svg").write_text(markup, encoding="utf-8")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for sheet, names in SHEETS:
        if not sheet.exists():
            raise FileNotFoundError(f"Missing licensed source: {sheet}")
        light = svg_body(sheet, dark=False)
        dark = svg_body(sheet, dark=True)
        for name, crop in zip(names, CROPS, strict=True):
            write_asset(name, light, crop, dark=False)
            write_asset(name, dark, crop, dark=True)


if __name__ == "__main__":
    main()
