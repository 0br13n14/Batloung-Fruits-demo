export function normalizeNumericRows(rows, fields) {
  return rows.map((row) => {
    const normalized = { ...row };
    for (const field of fields) {
      if (normalized[field] !== null && normalized[field] !== undefined) {
        normalized[field] = Number(normalized[field]);
      }
    }
    return normalized;
  });
}
