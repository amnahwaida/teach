const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { cookies } = require('next/headers');
const { prisma } = require('./prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'ajar-in-secret-key-change-in-production-2024';
const TOKEN_EXPIRY = '7d';

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

/**
 * Compare a password with its hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Verify and decode a JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user from cookies
 * Returns null if not authenticated
 */
async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return null;
    
    const decoded = verifyToken(token);
    if (!decoded) return null;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    
    if (!user || user.status === 'suspended') return null;
    
    return user;
  } catch {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
async function requireAuth(requiredRole = null) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  
  if (requiredRole && user.role !== requiredRole) {
    throw new Error('FORBIDDEN');
  }
  
  return user;
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  getCurrentUser,
  requireAuth,
  JWT_SECRET,
};
