export const resolveAssignee = (name: string, users: any[]) => {
  console.log(name);
  const matches = users.filter(
    (u) => u.displayName.toLowerCase() === name.toLowerCase(),
  );

  if (matches.length > 0) {
    console.log(matches, "matchess");
    return matches[0].id;
  }

  return null;
};


