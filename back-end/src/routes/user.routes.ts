import { Router } from "express";
import { getUsers, createUser } from "../services/user.service";

const router = Router();

// GET /users - list all users dynamically
router.get("/", (req, res) => {
  const allUsers = getUsers();
  const safeUsers = allUsers.map(({ password, ...user }) => user);
  res.json(safeUsers);
});

// POST /users - manually add / create user from backend
router.post("/", (req: any, res: any) => {
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
    return res.status(400).json({ message: err.message || "Failed to add user" });
  }
});

export default router;
