import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface User {
  id: string;
  username: string;
  password?: string;
  displayName: string;
}

const USERS_FILE = path.join(__dirname, "../data/users.json");

export const getUsers = (): User[] => {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf-8");
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data) as User[];
  } catch (err) {
    console.error("Error reading users file:", err);
    return [];
  }
};

export const saveUsers = (users: User[]): void => {
  try {
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
