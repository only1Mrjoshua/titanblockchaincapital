import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import { generateUserToken } from '../utils/generateToken.js';
import { v2 as cloudinary } from 'cloudinary';
import { 
  generateOTP, 
  getOTPExpiry, 
  sendEmailOTP
} from '../utils/otpResend.js';
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validatePasswordMatch
} from '../utils/validators.js';


const generateVerificationToken = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${random}${random2}`;
};


// @desc    Register new user
// @route   POST /api/user/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, phoneNumber, password, confirmPassword, countryCode = '+1' } = req.body;

  if (!fullName || !email || !phoneNumber || !password || !confirmPassword) {
    res.status(400);
    throw new Error('Please provide all required fields: full name, email, phone number, password, and confirm password');
  }

  if (!validateFullName(fullName)) {
    res.status(400);
    throw new Error('Full name must be between 2 and 50 characters');
  }

  if (!validateEmail(email)) {
    res.status(400);
    throw new Error('Please provide a valid email address');
  }

  if (!validatePhoneNumber(phoneNumber)) {
    res.status(400);
    throw new Error('Please provide a valid phone number (10-15 digits)');
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    const errorMessages = Object.values(passwordValidation.errors).filter(msg => msg !== null);
    res.status(400);
    throw new Error(errorMessages.join('. '));
  }

  if (!validatePasswordMatch(password, confirmPassword)) {
    res.status(400);
    throw new Error('Passwords do not match');
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail && existingEmail.isVerified) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  const existingPhone = await User.findOne({ phoneNumber });
  if (existingPhone && existingPhone.isVerified) {
    res.status(409);
    throw new Error('An account with this phone number already exists');
  }

  const emailOTP = generateOTP();
  const otpExpiry = getOTPExpiry();
  const verificationToken = generateVerificationToken();

  let user = await User.findOne({
    $or: [{ email }, { phoneNumber }],
    isVerified: false
  });

  if (user) {
    user.fullName = fullName;
    user.email = email;
    user.phoneNumber = phoneNumber;
    user.password = password;
    user.countryCode = countryCode;
    user.otp = emailOTP;
    user.otpExpiry = otpExpiry;
    user.verificationToken = verificationToken;
    user.failedVerificationAttempts = 0;
    user.kycStatus = 'pending';
    if (req.file) {
      user.profileImage = req.file.path;
      user.profileImagePublicId = req.file.filename;
    }
    await user.save();
  } else {
    user = await User.create({
      fullName,
      email,
      phoneNumber,
      password,
      countryCode,
      otp: emailOTP,
      otpExpiry,
      verificationToken,
      isVerified: false,
      isPhoneVerified: true,
      kycStatus: 'pending',
      profileImage: req.file?.path,
      profileImagePublicId: req.file?.filename,
    });
  }

  await sendEmailOTP(email, emailOTP, fullName, 'verification');

  res.status(201).json({
    status: 'pending',
    message: 'Registration initiated. Verification code sent to your email.',
    verificationToken,
    email: user.email,
    phoneNumber: `${user.countryCode}${user.phoneNumber}`,
    expiresIn: '15 minutes',
    nextSteps: {
      email: 'Check your email for verification code',
      verify: 'Use /api/user/verify to complete registration'
    }
  });
});


// @desc    Verify email OTP
// @route   POST /api/user/verify
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, emailOTP, verificationToken } = req.body;

  // Validate required fields
  if (!email || !emailOTP || !verificationToken) {
    res.status(400);
    throw new Error('Verification requires email, email OTP, and verification token');
  }

  // Find user with valid verification token and unexpired OTP
  const user = await User.findOne({
    email,
    verificationToken,
    otpExpiry: { $gt: new Date() }
  }).select('+otp +failedVerificationAttempts');

  // Check if user exists
  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired verification request');
  }

  // Check if already verified
  if (user.isVerified) {
    res.status(400);
    throw new Error('Account already verified');
  }

  // Check failed attempts limit
  if (user.failedVerificationAttempts >= 5) {
    res.status(429);
    throw new Error('Too many failed attempts. Please request a new verification code.');
  }

  // Verify OTP
  if (user.otp !== emailOTP) {
    user.failedVerificationAttempts += 1;
    await user.save();
    res.status(400);
    throw new Error('Invalid verification code');
  }

  // Mark user as verified
  user.isVerified = true;
  user.verifiedAt = new Date();
  user.otp = undefined;
  user.otpExpiry = undefined;
  user.verificationToken = undefined;
  user.failedVerificationAttempts = 0;
  await user.save();

  // Generate JWT token for user
  const token = generateUserToken(res, user._id);

  console.log('✅ User verified successfully:', {
    userId: user._id,
    email: user.email,
    fullName: user.fullName
  });

  // Send success response with token and user data
  res.status(200).json({
    status: 'verified',
    message: 'Account successfully verified',
    session: { 
      token,
      expiresIn: '7 days', 
      type: 'Bearer' 
    },
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: `${user.countryCode}${user.phoneNumber}`,
      role: user.role,
      kycStatus: user.kycStatus,
      verifiedAt: user.verifiedAt,
      profileImage: user.profileImage,
      createdAt: user.createdAt
    }
  });
});

// @desc    Resend verification code
// @route   POST /api/user/resend-verification
// @access  Public
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email address is required');
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('No account associated with this email');
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error('Account already verified');
  }

  const lastRequest = user.lastOTPRequest;
  if (lastRequest && new Date() - lastRequest < 60000) {
    res.status(429);
    throw new Error('Please wait 60 seconds before requesting a new code');
  }

  const emailOTP = generateOTP();
  const otpExpiry = getOTPExpiry();
  const verificationToken = generateVerificationToken();

  user.otp = emailOTP;
  user.otpExpiry = otpExpiry;
  user.verificationToken = verificationToken;
  user.lastOTPRequest = new Date();
  user.failedVerificationAttempts = 0;
  await user.save();

  await sendEmailOTP(email, emailOTP, user.fullName, 'resend');

  res.status(200).json({
    status: 'resent',
    message: 'New verification code sent to your email',
    verificationToken,
    expiresIn: '15 minutes',
    nextRequestAvailable: '60 seconds'
  });
});


// @desc    Login user
// @route   POST /api/user/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // Find user with sensitive fields
  const user = await User.findOne({ email })
    .select('+password +failedLoginAttempts +isLocked +lockedUntil');

  // Check if user exists
  if (!user) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Check if account is locked
  if (user.isLocked && user.lockedUntil && new Date() < user.lockedUntil) {
    const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 60000);
    res.status(429);
    throw new Error(`Account temporarily locked. Please try again in ${remainingTime} minutes`);
  } 
  
  // Auto-unlock if lock period has expired
  if (user.isLocked && user.lockedUntil && new Date() >= user.lockedUntil) {
    user.isLocked = false;
    user.lockedUntil = undefined;
    user.failedLoginAttempts = 0;
    await user.save();
  }

  // Check if account is verified
  if (!user.isVerified) {
    // Generate new OTP for unverified account
    const emailOTP = generateOTP();
    const otpExpiry = getOTPExpiry();
    const verificationToken = generateVerificationToken();

    user.otp = emailOTP;
    user.otpExpiry = otpExpiry;
    user.verificationToken = verificationToken;
    await user.save();

    // Send new verification email
    await sendEmailOTP(email, emailOTP, user.fullName, 'resend');

    res.status(403);
    throw new Error('Account not verified. A new verification code has been sent to your email.');
  }

  // Verify password
  const isValidPassword = await user.comparePassword(password);

  if (!isValidPassword) {
    // Increment failed login attempts
    user.failedLoginAttempts += 1;

    // Lock account after 5 failed attempts
    if (user.failedLoginAttempts >= 5) {
      user.isLocked = true;
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      await user.save();
      res.status(429);
      throw new Error('Too many failed attempts. Account locked for 30 minutes');
    }

    await user.save();
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Reset failed login attempts on successful login
  user.failedLoginAttempts = 0;
  user.isLocked = false;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  // Generate JWT token for user
  const token = generateUserToken(res, user._id);

  console.log('✅ User logged in successfully:', {
    userId: user._id,
    email: user.email,
    fullName: user.fullName,
    lastLoginAt: user.lastLoginAt
  });

  // Send success response with token and user data
  res.status(200).json({
    status: 'authenticated',
    message: 'Login successful',
    session: { 
      token, 
      expiresIn: '7 days', 
      type: 'Bearer' 
    },
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: `${user.countryCode}${user.phoneNumber}`,
      role: user.role,
      kycStatus: user.kycStatus,
      accountType: user.accountType,
      lastLoginAt: user.lastLoginAt,
      preferences: user.preferences,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
      verifiedAt: user.verifiedAt
    }
  });
});

// @desc    Logout user
// @route   POST /api/user/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user.id, { lastLogoutAt: new Date() });
  }

  res.status(200).json({
    status: 'logged_out',
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
});


// @desc    Get current user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: req.user });
});


// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const { fullName, phoneNumber, countryCode, preferences } = req.body;

  if (req.file) {
    if (user.profileImagePublicId) {
      await cloudinary.uploader.destroy(user.profileImagePublicId);
    }
    user.profileImage = req.file.path;
    user.profileImagePublicId = req.file.filename;
  }

  if (fullName) user.fullName = fullName;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (countryCode) user.countryCode = countryCode;
  if (preferences) user.preferences = { ...user.preferences, ...preferences };

  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: `${user.countryCode}${user.phoneNumber}`,
      preferences: user.preferences,
      profileImage: user.profileImage,
      updatedAt: user.updatedAt,
    }
  });
});


// @desc    Delete profile image
// @route   DELETE /api/user/profile/image
// @access  Private
const deleteProfileImage = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.profileImagePublicId) {
    res.status(400);
    throw new Error('No profile image to delete');
  }

  await cloudinary.uploader.destroy(user.profileImagePublicId);

  user.profileImage = undefined;
  user.profileImagePublicId = undefined;
  await user.save();

  res.status(200).json({ status: 'success', message: 'Profile image deleted successfully' });
});


// @desc    Change password
// @route   POST /api/user/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const user = req.user;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    res.status(400);
    throw new Error('Please provide all password fields');
  }

  const isValidPassword = await user.comparePassword(currentPassword);
  if (!isValidPassword) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  if (newPassword !== confirmNewPassword) {
    res.status(400);
    throw new Error('New passwords do not match');
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    res.status(400);
    throw new Error('Password must contain at least 8 characters, including uppercase, lowercase, number, and special character');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ status: 'success', message: 'Password changed successfully' });
});


// @desc    Get all users
// @route   GET /api/user/admin/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .select('-password -otp -otpExpiry -verificationToken -failedLoginAttempts -deviceInfo')
    .sort('-createdAt');

  const stats = {
    total: users.length,
    verified: users.filter(u => u.isVerified).length,
    pending: users.filter(u => !u.isVerified).length,
    kycPending: users.filter(u => u.kycStatus === 'pending').length,
    kycSubmitted: users.filter(u => u.kycStatus === 'submitted').length,
    kycVerified: users.filter(u => u.kycStatus === 'verified').length,
    kycRejected: users.filter(u => u.kycStatus === 'rejected').length,
  };

  res.status(200).json({ status: 'success', stats, count: users.length, data: users });
});


// @desc    Get user by ID (Admin)
// @route   GET /api/user/admin/users/:id
// @access  Private/Admin
const getAdminUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -otp -otpExpiry -verificationToken');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({ status: 'success', data: user });
});


// @desc    Update user by ID (Admin)
// @route   PUT /api/user/admin/users/:id
// @access  Private/Admin
const updateUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { role, kycStatus, accountType, isVerified } = req.body;

  if (role) user.role = role;
  if (kycStatus) user.kycStatus = kycStatus;
  if (accountType) user.accountType = accountType;
  if (isVerified !== undefined) user.isVerified = isVerified;

  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      kycStatus: user.kycStatus,
      accountType: user.accountType,
      isVerified: user.isVerified,
    }
  });
});


// @desc    Delete user by ID (Admin)
// @route   DELETE /api/user/admin/users/:id
// @access  Private/Admin
const deleteUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.deleteOne();

  res.status(200).json({ status: 'success', message: 'User deleted successfully' });
});


// @desc    Manually verify user (Admin)
// @route   POST /api/user/admin/users/:id/verify
// @access  Private/Admin
const adminVerifyUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.kycStatus !== 'submitted') {
    res.status(400);
    throw new Error('User has not submitted registration payment yet');
  }

  user.kycStatus = 'verified';
  user.kycVerifiedAt = new Date();
  await user.save();

  res.status(200).json({ status: 'success', message: 'User KYC verified successfully' });
});


// @desc    Reject user KYC (Admin)
// @route   POST /api/user/admin/users/:id/reject
// @access  Private/Admin
const adminRejectUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.kycStatus !== 'submitted') {
    res.status(400);
    throw new Error('User has not submitted registration payment yet');
  }

  const { reason } = req.body;

  user.kycStatus = 'rejected';
  user.kycRejectedAt = new Date();
  user.kycRejectionReason = reason || 'Your registration payment could not be verified';
  await user.save();

  res.status(200).json({ status: 'success', message: 'User KYC rejected', reason: user.kycRejectionReason });
});


// @desc    Get user by ID
// @route   GET /api/user/users/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -otp -otpExpiry -verificationToken');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Unauthorized to view this profile');
  }

  res.status(200).json({ status: 'success', data: user });
});


// @desc    Deactivate account
// @route   POST /api/user/users/:id/deactivate
// @access  Private
const deactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user._id.toString() !== req.user.id) {
    res.status(403);
    throw new Error('You can only deactivate your own account');
  }

  user.isActive = false;
  user.deactivatedAt = new Date();
  await user.save();

  res.status(200).json({ status: 'success', message: 'Account deactivated successfully' });
});


// @desc    Reactivate account
// @route   POST /api/user/users/:id/reactivate
// @access  Private
const reactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user._id.toString() !== req.user.id) {
    res.status(403);
    throw new Error('You can only reactivate your own account');
  }

  user.isActive = true;
  user.deactivatedAt = undefined;
  await user.save();

  res.status(200).json({ status: 'success', message: 'Account reactivated successfully' });
});


export {
  registerUser,
  verifyOTP,
  resendOTP,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  deleteProfileImage,
  changePassword,
  getUsers,
  getAdminUserById,
  updateUserById,
  deleteUserById,
  adminVerifyUser,
  adminRejectUser,
  getUserById,
  deactivateAccount,
  reactivateAccount,
};