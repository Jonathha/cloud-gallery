export function isReservedUsername(name) {
  const clean = String(name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const reserved = ["admin", "administrador", "administrator", "mod", "moderador", "moderator", "suporte", "support", "sistema", "system", "guarly", "staff", "oficial", "official"];
  return reserved.some(r => clean === r || clean.startsWith(r) || clean.endsWith(r) || clean.includes(`_${r}`) || clean.includes(`${r}_`));
}
