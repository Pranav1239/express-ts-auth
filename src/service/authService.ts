import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { db } from '../utils/db';
import { hashToken } from '../utils/hashToken';


function generateAccessToken(user: User) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });
}

function generateRefreshToken(user: User, jti: string) {
  return jwt.sign(
    {
      userId: user.id,
      jti,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: '7d',
    }
  );
}



function generateTokens(user: any, jti: string, secretKey: string) {
  // Generate access token
  const accessToken = jwt.sign({ userId: user.id, jti }, secretKey, { expiresIn: '7d' });

  // Generate refresh token
  const refreshToken = jwt.sign({ userId: user.id, jti }, secretKey, { expiresIn: '7d' });

  return {
    accessToken,
    refreshToken,
  };
}




function addRefreshTokenToWhitelist({
  jti,
  refreshToken,
  userId,
}: {
  jti: string;
  refreshToken: string;
  userId: string;
}) {
  return db.refreshToken.create({
    data: {
      id: jti,
      hashedToken: hashToken(refreshToken),
      userId : userId,
    },
  });
}

function findRefreshTokenById(id?: string | undefined) {
  return db.refreshToken.findUnique({
    where: {
      id,
    },
  });
}

function deleteRefreshToken(id: string) {
  return db.refreshToken.update({
    where: {
      id,
    },
    data: {
      revoked: true,
    },
  });
}

function revokeTokens(userId: string) {
  return db.refreshToken.updateMany({
    where: {
      userId,
    },
    data: {
      revoked: true,
    },
  });
}

export { generateAccessToken, generateTokens, generateRefreshToken , addRefreshTokenToWhitelist, findRefreshTokenById, deleteRefreshToken, revokeTokens };
