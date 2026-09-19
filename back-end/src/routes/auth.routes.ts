import { Router, Request, Response } from "express";
import {
  findUserByUsername,
  createUser,
} from "../services/user.service";

export const handleLogin = (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const user = findUserByUsername(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    },
  });
};

export const handleRegister = (req: Request, res: Response) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const newUser = createUser({ username, password, displayName });
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || "Failed to create user" });
  }
};

const router = Router();
router.post("/", handleLogin);
router.post("/login", handleLogin);
router.post("/register", handleRegister);

export const registerRouter = Router();
registerRouter.post("/", handleRegister);
registerRouter.post("/register", handleRegister);

export default router;
