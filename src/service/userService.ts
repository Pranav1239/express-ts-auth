import bcrypt from 'bcrypt';
import { Prisma, PrismaClient } from '@prisma/client';

import { UserRequest } from '../interfaces/UserRequest';
import { db } from '../utils/db';



async function createUserByMobileNumberAndPassword(user: UserRequest): Promise<{ userId: string }> {
  try {
    const newUser = await db.user.create({
      data: {
        mobileNumber: user.mobileNumber,
        password: user.password,
        otp : user.otp
      },
    });

    return { userId: newUser.id }; // Return the user ID for further operations
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}


async function verifyOTP(mobileNumber: string, otp: string): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: {
        mobileNumber,
      },
    });

    if (!user || !user.otp) {
      return false; 
    }

    return user.otp === otp;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
}


async function findUserById(id: string): Promise<UserRequest | null> {
  try {
    const user = await db.user.findUnique({
      where: {
        id,
      },
    });
    return user;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    return null;
  }
}

export {
  createUserByMobileNumberAndPassword,
  verifyOTP,
  findUserById,
};
