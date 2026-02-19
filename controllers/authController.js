import dotenv from "dotenv";
dotenv.config();

import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import bcrypt from "bcryptjs";


const resend = new Resend(process.env.RESEND_API_KEY);

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "30d" }
  );
};

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      role: "user",
    });

    const token = generateToken(user._id);
    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;


    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }


    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);
    const userData = user.toObject();
    delete userData.password;

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const adminLogin = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      console.log("❌ Missing credentials");
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    console.log("User found:", user ? "Yes" : "No");

    if (!user || user.role !== "admin") {
      console.log("❌ Invalid admin credentials - user not found or not admin");
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    console.log("Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("❌ Invalid password");
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const token = generateToken(user._id);


    res.json({
      success: true,
      message: "Admin login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        phone,
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      const resendClient = getResend();
      
      const result = await resendClient.emails.send({
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: "Password Reset Request",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6; 
                  color: #333;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white;
                }
                .header { 
                  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                  color: white; 
                  padding: 40px 30px; 
                  text-align: center;
                }
                .header h1 { 
                  margin: 0; 
                  font-size: 28px;
                  font-weight: 600;
                }
                .content { 
                  padding: 40px 30px;
                  background: white;
                }
                .button { 
                  display: inline-block; 
                  padding: 16px 32px; 
                  background: #f97316;
                  color: white !important; 
                  text-decoration: none; 
                  border-radius: 8px;
                  font-weight: 600;
                  margin: 24px 0;
                }
                .warning { 
                  background: #fff3cd; 
                  border-left: 4px solid #ffc107; 
                  padding: 16px;
                  margin: 24px 0;
                  border-radius: 4px;
                }
                .footer { 
                  text-align: center; 
                  padding: 30px;
                  color: #666;
                  font-size: 14px;
                  background: #f9fafb;
                }
                .link-text {
                  word-break: break-all;
                  color: #f97316;
                  font-size: 14px;
                  margin: 16px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Password Reset Request</h1>
                </div>
                
                <div class="content">
                  <p style="font-size: 16px; margin-bottom: 8px;">Hi ${user.firstName || "there"},</p>
                  
                  <p style="font-size: 15px; color: #666; margin-bottom: 24px;">
                    We received a request to reset your password. Click the button below to create a new password:
                  </p>
                  
                  <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                  </div>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 24px;">
                    Or copy and paste this link into your browser:
                  </p>
                  <div class="link-text">${resetUrl}</div>
                  
                  <div class="warning">
                    <strong>⚠️ Important:</strong> This link will expire in 30 minutes for security reasons.
                  </div>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 24px;">
                    If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                  </p>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 32px;">
                    Best regards,<br>
                    <strong>${process.env.EMAIL_FROM_NAME} Team</strong>
                  </p>
                </div>
                
                <div class="footer">
                  <p style="margin: 0;">This is an automated email. Please do not reply.</p>
                  <p style="margin: 8px 0 0 0;">&copy; ${new Date().getFullYear()} ${process.env.EMAIL_FROM_NAME}. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      res.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    } catch (error) {
  
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please provide a new password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful. You can now login.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// const sendWelcomeEmail = async (email, firstName, password) => {
//   try {
//     await resend.emails.send({
//       from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
//       to: email,
//       subject: "Your Account Has Been Created",
//       html: `
//         <!DOCTYPE html>
//         <html>
//           <head>
//             <meta charset="utf-8">
//             <style>
//               body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//               .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//               .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
//               .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
//               .credentials { background: white; border: 2px dashed #f97316; border-radius: 8px; padding: 20px; margin: 20px 0; }
//               .credential-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
//               .label { color: #666; font-size: 14px; }
//               .value { font-weight: bold; color: #333; }
//               .button { display: inline-block; padding: 12px 30px; background: #f97316; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
//               .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; font-size: 13px; }
//             </style>
//           </head>
//           <body>
//             <div class="container">
//               <div class="header">
//                 <h1>Welcome to Our Store!</h1>
//                 <p>Your account has been created</p>
//               </div>
//               <div class="content">
//                 <p>Hi <strong>${firstName}</strong>,</p>
//                 <p>Your account has been automatically created when you placed your order. Here are your login credentials:</p>
                
//                 <div class="credentials">
//                   <h3 style="margin-top: 0; color: #f97316;">Your Login Details</h3>
//                   <div class="credential-item">
//                     <span class="label">Email:</span>
//                     <span class="value">${email}</span>
//                   </div>
//                   <div class="credential-item">
//                     <span class="label">Password:</span>
//                     <span class="value" style="color: #f97316; font-size: 18px; letter-spacing: 2px;">${password}</span>
//                   </div>
//                 </div>

//                 <div class="warning">
//                   ⚠️ <strong>Important:</strong> Please change your password after your first login for security.
//                 </div>

//                 <div style="text-align: center;">
//                   <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
//                 </div>

//                 <p>With your account you can:</p>
//                 <ul>
//                   <li>Track your orders</li>
//                   <li>View order history</li>
//                   <li>Save items to wishlist</li>
//                   <li>Faster checkout next time</li>
//                 </ul>

//                 <p>Best regards,<br><strong>${process.env.EMAIL_FROM_NAME} Team</strong></p>
//               </div>
//             </div>
//           </body>
//         </html>
//       `,
//     });
//   } catch (error) {
//     console.error("Welcome email error:", error);
//   }
// };