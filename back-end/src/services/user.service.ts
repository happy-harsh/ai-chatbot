import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface User {
  id: string;
  username: string;
  password?: string;
  displayName: string;
}

const DEFAULT_USERS: User[] = [
  { id: "u1", username: "savan", password: "1", displayName: "SAVAN" },
  { id: "u2", username: "harsh", password: "1", displayName: "HARSH" },
];

function resolveUsersFile(): string {
  const p1 = path.join(__dirname, "../data/users.json");
  const p2 = path.join(process.cwd(), "src/data/users.json");
  const p3 = path.join(process.cwd(), "data/users.json");

  if (fs.existsSync(p1)) return p1;
  if (fs.existsSync(p2)) return p2;
  if (fs.existsSync(p3)) return p3;

  // If running in production (dist), default to process.cwd()/src/data/users.json or p1
  return fs.existsSync(path.dirname(p2)) ? p2 : p1;
}

const USERS_FILE = resolveUsersFile();

export const getUsers = (): User[] => {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      const dir = path.dirname(USERS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(DEFAULT_USERS, null, 2),
        "utf-8"
      );
      return DEFAULT_USERS;
    }
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    const parsed = JSON.parse(data) as User[];
    return parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch (err) {
    console.error("Error reading users file:", err);
    return DEFAULT_USERS;
  }
};

export const saveUsers = (users: User[]): void => {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing users file:", err);
    throw new Error("Failed to save user data");
  }
};

export const findUserByUsername = (username: string): User | undefined => {
  const users = getUsers();
  return users.find(
    (u) => u.username.trim().toLowerCase() === username.trim().toLowerCase()
  );
};

export const findUserById = (id: string): User | undefined => {
  const users = getUsers();
  return users.find((u) => u.id === id);
};

export const createUser = ({
  username,
  password,
  displayName,
}: {
  username: string;
  password: string;
  displayName?: string;
}): User => {
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();
  const finalDisplayName = displayName?.trim() || trimmedUsername;

  if (!trimmedUsername) {
    throw new Error("Username is required");
  }
  if (!trimmedPassword) {
    throw new Error("Password is required");
  }

  const users = getUsers();
  const existing = users.find(
    (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()
  );
  if (existing) {
    throw new Error("Username already taken");
  }

  const newUser: User = {
    id: `u_${Date.now()}_${uuidv4().substring(0, 5)}`,
    username: trimmedUsername,
    password: trimmedPassword,
    displayName: finalDisplayName,
  };

  users.push(newUser);
  saveUsers(users);

  return newUser;
};
