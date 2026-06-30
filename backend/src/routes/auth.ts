import { Router } from "express";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";
import supabase from "../lib/supabase";
import { asyncHandler, authenticate } from "../middleware/auth";
import { AppError } from "../lib/errors";
import { getUserSettings, getArticleHistory, getSavedSketches, getLibraryCollections } from "../lib/db";
import { getUserInterests } from "../lib/memory";

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
      .select("id, email, username, token_balance")
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
      .select("id, email, username, password_hash, token_balance")
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
        token_balance: user.token_balance,
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
      .select("id, email, username, token_balance")
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
        .select("id, email, username, token_balance")
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
      .select("id, email, username, token_balance")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return next(new AppError(404, "User profile not found"));
    }

    res.json(user);
  }),
);

/**
 * @route   GET /api/auth/bootstrap
 * @desc    Fetch all user session data in a single parallel request:
 *          user profile, settings, interests, library, saved sketches, history
 * @access  Private
 */
router.get(
  "/bootstrap",
  authenticate,
  asyncHandler(async (req, res, next) => {
    const userId = (req as any).userId;

    const [userResult, settings, interests, library, saved, history] =
      await Promise.all([
        supabase
          .from("users")
          .select("id, email, username, token_balance")
          .eq("id", userId)
          .single(),
        getUserSettings(userId),
        getUserInterests(userId),
        getLibraryCollections(userId),
        getSavedSketches(userId),
        getArticleHistory(userId),
      ]);

    if (userResult.error || !userResult.data) {
      return next(new AppError(404, "User profile not found"));
    }

    res.json({
      user: userResult.data,
      settings,
      interests,
      library,
      saved,
      history,
    });
  }),
);

export default router;
