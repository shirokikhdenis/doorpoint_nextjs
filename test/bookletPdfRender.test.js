const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { getFormatById } = require("../src/lib/booklet-formats");
const { renderBookletPdf } = require("../src/lib/server/domain/bookletPdfRender");

const jpeg = (width, height) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 200, b: 210 } } })
    .jpeg()
    .toBuffer();

const sampleProduct = async (id, name) => ({
  id,
  name,
  priceLabel: "от 19 900 ₽",
  imageBuffer: await jpeg(240, 400),
});

const basePayload = async (formatId) => {
  const photo = await sampleProduct(1, "Альфа эмаль белая");
  const photo2 = await sampleProduct(2, "Гранит Т3");
  return {
    format: getFormatById(formatId),
    headline: "Входные и межкомнатные двери",
    subhead: "Бесплатный замер · Доставка и монтаж",
    couponText: "Скидка 5% на монтаж при предъявлении этого буклета",
    showPrices: true,
    showComparePrices: true,
    phone: "+7 921 290 5999",
    email: "doorpoint29@yandex.ru",
    addressShort: "Архангельск, ТЦ «Новосёл»",
    addressFull: "Архангельск, ТЦ Новосёл, пр. Московский, д. 25",
    hours: "Пн–Пт: 11:00–19:00",
    siteHost: "doorpoint29.ru",
    qrHint: "Каталог и отзывы на сайте",
    logoBuffer: await jpeg(400, 80),
    qrBuffer: await jpeg(128, 128),
    entryProducts: [
      {
        ...photo2,
        metaLine: "ПрофМет · Антрацит",
        compareLabel: "48 900 ₽",
        badges: ["Хит"],
      },
    ],
    interiorProducts: [
      {
        ...photo,
        metaLine: "Браво · Белый",
        compareLabel: "",
        badges: ["Акция"],
      },
    ],
  };
};

test("renderBookletPdf builds a PDF for each format", async () => {
  for (const formatId of ["a4", "a5", "a5-booklet"]) {
    const buffer = await renderBookletPdf(await basePayload(formatId));
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 1000);
    assert.equal(buffer.subarray(0, 4).toString(), "%PDF");
  }
});

test("renderBookletPdf cover works with a single hero door", async () => {
  const payload = await basePayload("a5-booklet");
  payload.entryProducts = [];
  payload.interiorProducts = [payload.interiorProducts[0]];
  const buffer = await renderBookletPdf(payload);
  assert.equal(buffer.subarray(0, 4).toString(), "%PDF");
});
