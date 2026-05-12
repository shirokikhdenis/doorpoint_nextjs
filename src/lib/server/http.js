const toQueryObject = (searchParams) => {
  const query = {};
  for (const [key, value] of searchParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const prev = query[key];
      query[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else {
      query[key] = value;
    }
  }
  return query;
};

const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });

const noContent = () => new Response(null, { status: 204 });

const handleApiError = (error) => {
  const message = error?.message || "Internal server error";
  const status = Number.isInteger(error?.status) ? error.status : 500;
  return json({ message }, status);
};

module.exports = {
  toQueryObject,
  json,
  noContent,
  handleApiError
};
