import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';

// For USER authentication
export const generateUserToken = (res, userId) => {
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: isProduction,           // ✅ false in dev (HTTP), true in prod (HTTPS)
    sameSite: isProduction ? 'None' : 'Lax', // ✅ 'None' needs secure:true, so use 'Lax' in dev
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};

// For ADMIN authentication
export const generateAdminToken = (res, adminId) => {
  const token = jwt.sign(
    { adminId },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.cookie('admin_jwt', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return token;
};

export default generateUserToken;