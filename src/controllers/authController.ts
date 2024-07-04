import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  generateTokens,
  addRefreshTokenToWhitelist,
  findRefreshTokenById,
  deleteRefreshToken,
  revokeTokens,
} from '../service/authService';
import { verifyOTP, createUserByMobileNumberAndPassword, findUserById } from '../service/userService';
import { APIError } from '../interfaces/ApiErrorResponse';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { hashToken } from '../utils/hashToken';
import catchAsync from '../utils/catchAsync';
import { db } from '../utils/db';
import { UserRequest } from '../interfaces/UserRequest';
import axios from 'axios';

var API_KEY = process.env.FASTSMSKEY!;

function generateRandom4Digits(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

async function SendOtp(number: string, otp: string) {
  try {
    const resp = await axios.get(
      `https://www.fast2sms.com/dev/bulkV2?authorization=${API_KEY}&route=otp&flash=0&variables_values=${otp}&numbers=${number}`
    );

    console.log('mobile otp response', resp.data);
    return resp;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error sending OTP', error.response?.data || error.message);
    } else {
      console.error('Unexpected error sending OTP', error);
    }
    throw new APIError(500, 'Failed to send OTP');
  }
}

const registerController = catchAsync(async (req, res): Promise<void> => {
  try {
    const { mobileNumber, password } = req.body as { mobileNumber: string; password: string };

    if (!mobileNumber || !password) {
      throw new APIError(400, 'You must provide a mobile number and a password.');
    }

    const existingUser = await db.user.findUnique({
      where: {
        mobileNumber,
      },
    });

    const random4Digits = generateRandom4Digits();
    const otp = random4Digits.toString();

    function generateUniqueId(): string {
      return uuidv4();
    }

    await SendOtp(mobileNumber, otp);

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(password, 12);
      console.log('HashPassword ', hashedPassword);
      const userAccount: UserRequest = {
        id: generateUniqueId(),
        mobileNumber,
        password: hashedPassword,
        otp,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user = await createUserByMobileNumberAndPassword(userAccount);
      res.status(200).json({ message: 'Account created successfully', user });
    } else {
      const passwordMatches = await bcrypt.compare(password, existingUser.password);

      if (!passwordMatches) {
         res.status(401).json({ error: 'Password does not match' });
      }

      const user = await db.user.update({
        where: {
          mobileNumber,
        },
        data: {
          otp,
        },
      });

      res.status(200).json({ message: 'Check OTP', user });
    }
  } catch (err: any) {
    if (err instanceof APIError) {
      const apiError: APIError = err;
      res.status(apiError.statusCode).json({ error: apiError.message });
    } else {
      console.error('Internal server error', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});



const loginController = catchAsync(async (req, res): Promise<void> => {
  try {
    const { mobileNumber, otp } = req.body as { mobileNumber: string; otp: string };

    if (!mobileNumber || !otp) {
      throw new APIError(400, 'You must provide a mobile number and an OTP.');
    }

    const user = await db.user.findUnique({
      where: {
        mobileNumber,
      },
    });

    if (!user) {
      throw new APIError(403, 'User not found.');
    }

    if (otp !== user.otp) {
      throw new APIError(403, 'Invalid OTP.');
    }

    const jti = uuidv4();
    const { accessToken, refreshToken } = generateTokens(user, jti, process.env.JWT_SECRET!);

    await addRefreshTokenToWhitelist({ jti, refreshToken, userId: user.id });

    res.json({
      accessToken,
      refreshToken,
      user,
    });
  } catch (err: any) {
    if (err instanceof APIError) {
      const apiError: APIError = err;
      res.status(apiError.statusCode).json({ error: apiError.message });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});


const refreshTokenController = catchAsync(async (req, res): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };

    if (!refreshToken) {
      throw new APIError(400, 'Missing refresh token.');
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as { jti: string; userId: string };

    const savedRefreshToken = await findRefreshTokenById(payload.jti);

    if (!savedRefreshToken || savedRefreshToken.revoked === true) {
      throw new APIError(401, 'Unauthorized');
    }

    const hashedToken = hashToken(refreshToken);
    if (hashedToken !== savedRefreshToken.hashedToken) {
      throw new APIError(401, 'Unauthorized');
    }

    const user = await db.user.findUnique({
      where: {
        id: payload.userId,
      },
    });

    if (!user) {
      throw new APIError(401, 'Unauthorized');
    }

    await deleteRefreshToken(savedRefreshToken.id);

    const jti = uuidv4();
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user, jti, process.env.JWT_SECRET!);
    await addRefreshTokenToWhitelist({ jti, refreshToken: newRefreshToken, userId: user.id });

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err: any) {
    if (err instanceof APIError) {
      const apiError: APIError = err;
      res.status(apiError.statusCode).json({ error: apiError.message });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

const revokeRefreshTokensController = catchAsync(async (req, res): Promise<void> => {
  try {
    const { userId } = req.body as { userId: string };

    if (!userId) {
      throw new APIError(400, 'Missing user ID.');
    }

    await revokeTokens(userId);

    res.json({ message: `Tokens revoked for user with id #${userId}` });
  } catch (err: any) {
    console.log(err);
    if (err instanceof APIError) {
      const apiError: APIError = err;
      res.status(apiError.statusCode).json({ error: apiError.message });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

export default {
  registerController,
  loginController,
  refreshTokenController,
  revokeRefreshTokensController,
};
