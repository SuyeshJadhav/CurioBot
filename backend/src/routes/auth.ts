import { Router } from "express";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";
import supabase from "../lib/supabase";
import { asyncHandler, authenticate } from "../middleware/auth";
import { AppError } from "../lib/errors";

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  asyncHandler(async (req, res, next) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return next(
        new AppError(400, "Email, username, and password are required"),
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (existingUser) {
      return next(
        new AppError(400, "User with this email or username already exists"),
      );
    }

    const passwordHash = hashPassword(password);
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({ email, username, password_hash: passwordHash })
      .select("id, email, username")
      .single();

    if (insertError) {
      throw insertError;
    }

    const token = generateToken(newUser.id);
    res.json({ token, user: newUser });
  }),
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  "/login",
  asyncHandler(async (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return next(
        new AppError(400, "Username/Email and password are required"),
      );
    }

    // Lookup by username or email
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, username, password_hash")
      .or(`email.eq.${username},username.eq.${username}`)
      .maybeSingle();

    if (error) throw error;
    if (!user || !verifyPassword(password, user.password_hash)) {
      return next(new AppError(400, "Invalid username/email or password"));
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  }),
);

/**
 * @route   POST /api/auth/oauth/callback
 * @desc    Exchange Supabase token for CurioBot token
 * @access  Public
 */
router.post(
  "/oauth/callback",
  asyncHandler(async (req, res, next) => {
    const { access_token } = req.body;
    if (!access_token) {
      return next(new AppError(400, "Access token is required"));
    }

    // Verify token with Supabase to get user details
    const { data: { user }, error } = await supabase.auth.getUser(access_token);
    
    if (error || !user || !user.email) {
      return next(new AppError(401, "Invalid OAuth token"));
    }

    // Check if user exists in our custom users table
    let { data: existingUser } = await supabase
      .from("users")
      .select("id, email, username")
      .eq("email", user.email)
      .maybeSingle();

    if (!existingUser) {
      // Create new user linked to OAuth email
      const dummyHash = hashPassword(Math.random().toString(36).slice(-8) + "OAuth!");
      const defaultUsername = user.email.split("@")[0] + Math.floor(Math.random() * 1000);
      
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({ 
          email: user.email, 
          username: defaultUsername, 
          password_hash: dummyHash 
        })
        .select("id, email, username")
        .single();

      if (insertError) throw insertError;
      existingUser = newUser;
    }

    const token = generateToken(existingUser.id);
    res.json({ token, user: existingUser });
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile details
 * @access  Private
 */
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res, next) => {
    const userId = (req as any).userId;
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, username")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return next(new AppError(404, "User profile not found"));
    }

    res.json(user);
  }),
);

export default router;
