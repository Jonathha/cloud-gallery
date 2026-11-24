export function isAiUsername(name) {
  const raw = String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const clean = raw.replace(/[^a-z0-9]/g, "");
  const tokens = raw.split(/[^a-z0-9]+/).filter(Boolean);
  if (!clean) return false;
  if (clean === "ia" || clean === "inteligenciaartificial" || clean === "aiassistant" || /^ia\d+$/.test(clean)) {
    return true;
  }
  return tokens.includes("ia");
}

export function isReservedUsername(name) {
  if (isAiUsername(name)) return true;
  const clean = String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  const reserved = [
    "admin", "administrador", "administrator", "mod", "moderador", "moderator",
    "suporte", "support", "sistema", "system", "guarly", "staff", "oficial", "official"
  ];
  return reserved.some(
    r => clean === r || clean.startsWith(r) || clean.endsWith(r) || clean.includes(`_${r}`) || clean.includes(`${r}_`)
  );
}
