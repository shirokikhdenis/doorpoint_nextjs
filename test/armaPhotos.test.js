const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isImageResource,
  mapYandexResourceToPhoto,
  mapYandexListingToPhotos,
} = require("../src/lib/server/domain/armaPhotos");

test("isImageResource accepts image files and skips dirs", () => {
  assert.equal(isImageResource({ type: "file", media_type: "image", mime_type: "image/jpeg" }), true);
  assert.equal(isImageResource({ type: "file", mime_type: "image/webp" }), true);
  assert.equal(isImageResource({ type: "dir", media_type: "image" }), false);
  assert.equal(isImageResource({ type: "file", media_type: "document", mime_type: "application/pdf" }), false);
});

test("mapYandexResourceToPhoto prefers sized previews and original file", () => {
  const photo = mapYandexResourceToPhoto({
    name: "door.JPG",
    path: "/door.JPG",
    preview: "https://example.com/preview-s",
    file: "https://example.com/file",
    modified: "2024-01-02T00:00:00+00:00",
    sizes: [
      { name: "S", url: "https://example.com/s" },
      { name: "XL", url: "https://example.com/xl" },
      { name: "ORIGINAL", url: "https://example.com/original" },
    ],
  });

  assert.equal(photo.id, "/door.JPG");
  assert.equal(photo.name, "door.JPG");
  assert.equal(photo.previewUrl, "https://example.com/xl");
  assert.equal(photo.imageUrl, "https://example.com/original");
  assert.equal(photo.modifiedAt, "2024-01-02T00:00:00+00:00");
});

test("mapYandexListingToPhotos filters non-images and sorts newest first", () => {
  const photos = mapYandexListingToPhotos({
    _embedded: {
      items: [
        {
          type: "file",
          media_type: "image",
          name: "old.jpg",
          path: "/old.jpg",
          preview: "https://example.com/old",
          modified: "2023-01-01T00:00:00Z",
        },
        {
          type: "file",
          media_type: "document",
          name: "notes.pdf",
          path: "/notes.pdf",
          preview: "https://example.com/pdf",
        },
        {
          type: "file",
          media_type: "image",
          name: "new.jpg",
          path: "/new.jpg",
          preview: "https://example.com/new",
          modified: "2025-01-01T00:00:00Z",
        },
      ],
    },
  });

  assert.equal(photos.length, 2);
  assert.deepEqual(
    photos.map((item) => item.name),
    ["new.jpg", "old.jpg"],
  );
});

test("photoMatchesSelectedTags uses AND across categories and OR inside a category", () => {
  const {
    photoMatchesSelectedTags,
  } = require("../src/lib/server/domain/armaPhotos");

  const tags = [
    { id: 1, categoryId: 10, name: "черный" },
    { id: 2, categoryId: 10, name: "белый" },
    { id: 3, categoryId: 20, name: "со стеклопакетом" },
    { id: 4, categoryId: 30, name: "двухстворчатая" },
  ];

  assert.equal(photoMatchesSelectedTags([1, 3], [], tags), true);
  assert.equal(photoMatchesSelectedTags([1, 3], [1], tags), true);
  assert.equal(photoMatchesSelectedTags([1, 3], [1, 2], tags), true);
  assert.equal(photoMatchesSelectedTags([1, 3], [1, 4], tags), false);
  assert.equal(photoMatchesSelectedTags([1, 3, 4], [1, 4], tags), true);
});

test("sanitizeArmaPhotoFilename strips unsafe characters", () => {
  const {
    sanitizeArmaPhotoFilename,
    uniqueArmaPhotoFilename,
    mapLocalFileToPhoto,
  } = require("../src/lib/server/domain/armaPhotos");

  assert.equal(sanitizeArmaPhotoFilename("IMG 1847 (1).JPG"), "IMG_1847_1.jpg");
  const used = new Set();
  assert.equal(uniqueArmaPhotoFilename("door.jpg", used), "door.jpg");
  assert.equal(uniqueArmaPhotoFilename("door.jpg", used), "door-2.jpg");

  const photo = mapLocalFileToPhoto({
    fileName: "door.jpg",
    name: "IMG_1847.JPG",
    modifiedAt: "2026-08-26T08:11:47+00:00",
  });
  assert.equal(photo.previewUrl, "/uploads/arma-photos/door.jpg");
  assert.equal(photo.imageUrl, "/uploads/arma-photos/door.jpg");
  assert.equal(photo.name, "IMG_1847.JPG");
});
