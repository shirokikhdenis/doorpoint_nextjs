const UNITS = [
  ["ноль"],
  ["один", "одна"],
  ["два", "две"],
  ["три", "три"],
  ["четыре", "четыре"],
  ["пять", "пять"],
  ["шесть", "шесть"],
  ["семь", "семь"],
  ["восемь", "восемь"],
  ["девять", "девять"],
];

const TEENS = [
  "десять",
  "одиннадцать",
  "двенадцать",
  "тринадцать",
  "четырнадцать",
  "пятнадцать",
  "шестнадцать",
  "семнадцать",
  "восемнадцать",
  "девятнадцать",
];

const TENS = [
  "",
  "десять",
  "двадцать",
  "тридцать",
  "сорок",
  "пятьдесят",
  "шестьдесят",
  "семьдесят",
  "восемьдесят",
  "девяносто",
];

const HUNDREDS = [
  "",
  "сто",
  "двести",
  "триста",
  "четыреста",
  "пятьсот",
  "шестьсот",
  "семьсот",
  "восемьсот",
  "девятьсот",
];

const pluralForm = (value, forms) => {
  const n = Math.abs(Number(value)) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
};

const capitalizeFirst = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return raw;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const tripletToWords = (value, feminine = false) => {
  const n = Number(value) || 0;
  if (n === 0) return "";

  const parts = [];
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;

  if (hundreds > 0) parts.push(HUNDREDS[hundreds]);
  if (tens === 1) {
    parts.push(TEENS[units]);
  } else {
    if (tens > 1) parts.push(TENS[tens]);
    if (units > 0) {
      const unitWord = feminine ? UNITS[units][1] : UNITS[units][0];
      parts.push(unitWord);
    }
  }

  return parts.join(" ");
};

const numberToWordsRu = (value) => {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  if (amount === 0) return "ноль";

  const billions = Math.floor(amount / 1_000_000_000);
  const millions = Math.floor((amount % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((amount % 1_000_000) / 1_000);
  const remainder = amount % 1_000;

  const parts = [];

  if (billions > 0) {
    parts.push(tripletToWords(billions));
    parts.push(pluralForm(billions, ["миллиард", "миллиарда", "миллиардов"]));
  }
  if (millions > 0) {
    parts.push(tripletToWords(millions));
    parts.push(pluralForm(millions, ["миллион", "миллиона", "миллионов"]));
  }
  if (thousands > 0) {
    parts.push(tripletToWords(thousands, true));
    parts.push(pluralForm(thousands, ["тысяча", "тысячи", "тысяч"]));
  }
  if (remainder > 0 || parts.length === 0) {
    parts.push(tripletToWords(remainder));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
};

const formatRublesInWords = (value) => {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  const words = numberToWordsRu(amount);
  const rublesLabel = pluralForm(amount, ["рубль", "рубля", "рублей"]);
  const kopecks = "00";
  const kopecksLabel = pluralForm(0, ["копейка", "копейки", "копеек"]);

  return {
    words,
    wordsCap: capitalizeFirst(words),
    rublesLabel,
    kopecks,
    kopecksLabel,
    full: `${capitalizeFirst(words)} ${rublesLabel} ${kopecks} ${kopecksLabel}`,
    inParentheses: capitalizeFirst(words),
  };
};

module.exports = {
  numberToWordsRu,
  formatRublesInWords,
};
