export const resolveAssignee = (name: string, users: any[]) => {
  if (!name) return null;
  const cleanName = name.trim().toLowerCase();

  // 1. Exact match on displayName or username
  let match = users.find(
    (u) =>
      u.displayName?.toLowerCase() === cleanName ||
      u.username?.toLowerCase() === cleanName,
  );
  if (match) return match.id;

  // 2. First name match (e.g. "Emma" for "Emma Wilson")
  match = users.find((u) => {
    const first = u.displayName?.toLowerCase().split(" ")[0];
    return first === cleanName;
  });
  if (match) return match.id;

  // 3. Substring match
  match = users.find(
    (u) =>
      u.displayName?.toLowerCase().includes(cleanName) ||
      u.username?.toLowerCase().includes(cleanName),
  );
  if (match) return match.id;

  return null;
};


