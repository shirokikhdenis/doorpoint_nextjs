const CYRILLIC_TO_LATIN = [
  ["щ", "sch"],
  ["ш", "sh"],
  ["ч", "ch"],
  ["ц", "ts"],
  ["ю", "yu"],
  ["я", "ya"],
  ["ё", "yo"],
  ["ж", "zh"],
  ["х", "kh"],
  ["ъ", ""],
  ["ь", ""],
  ["э", "e"],
  ["ы", "y"],
  ["а", "a"],
  ["б", "b"],
  ["в", "v"],
  ["г", "g"],
  ["д", "d"],
  ["е", "e"],
  ["з", "z"],
  ["и", "i"],
  ["й", "y"],
  ["к", "k"],
  ["л", "l"],
  ["м", "m"],
  ["н", "n"],
  ["о", "o"],
  ["п", "p"],
  ["р", "r"],
  ["с", "s"],
  ["т", "t"],
  ["у", "u"],
  ["ф", "f"],
];

const transliterateCyrillic = (value) => {
  let out = String(value || "").toLowerCase().replace(/ё/g, "е");
  for (const [from, to] of CYRILLIC_TO_LATIN) {
    out = out.split(from).join(to);
  }
  return out;
};

const slugifyPart = (value) =>
  transliterateCyrillic(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

module.exports = {
  transliterateCyrillic,
  slugifyPart,
};
