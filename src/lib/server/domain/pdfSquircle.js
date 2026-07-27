const SQUIRCLE_EXPONENT = 4;
const SQUIRCLE_CORNER_STEPS = 12;

const superellipseOffset = (angle, radius) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const power = 2 / SQUIRCLE_EXPONENT;

  return {
    x: radius * Math.sign(cos) * Math.pow(Math.abs(cos), power),
    y: radius * Math.sign(sin) * Math.pow(Math.abs(sin), power),
  };
};

const appendSuperellipseCorner = (doc, cx, cy, radius, startAngle, endAngle) => {
  for (let i = 1; i <= SQUIRCLE_CORNER_STEPS; i += 1) {
    const angle = startAngle + ((endAngle - startAngle) * i) / SQUIRCLE_CORNER_STEPS;
    const offset = superellipseOffset(angle, radius);
    doc.lineTo(cx + offset.x, cy + offset.y);
  }
};

const traceSquircleRect = (doc, x, y, width, height, radius) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) {
    doc.rect(x, y, width, height);
    return doc;
  }

  doc.moveTo(x + r, y);
  doc.lineTo(x + width - r, y);
  appendSuperellipseCorner(doc, x + width - r, y + r, r, -Math.PI / 2, 0);
  doc.lineTo(x + width, y + height - r);
  appendSuperellipseCorner(doc, x + width - r, y + height - r, r, 0, Math.PI / 2);
  doc.lineTo(x + r, y + height);
  appendSuperellipseCorner(doc, x + r, y + height - r, r, Math.PI / 2, Math.PI);
  doc.lineTo(x, y + r);
  appendSuperellipseCorner(doc, x + r, y + r, r, Math.PI, (3 * Math.PI) / 2);
  doc.closePath();
  return doc;
};

const strokeSquircleRect = (doc, x, y, width, height, radius, options = {}) => {
  const { strokeColor, lineWidth = 0.5 } = options;
  doc.save();
  if (strokeColor) doc.strokeColor(strokeColor);
  doc.lineWidth(lineWidth);
  traceSquircleRect(doc, x, y, width, height, radius);
  doc.stroke();
  doc.restore();
  return doc;
};

module.exports = {
  traceSquircleRect,
  strokeSquircleRect,
};
