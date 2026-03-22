import speakeasy from 'speakeasy';

const appLabel = () =>
  process.env.TWO_FACTOR_ISSUER || process.env.APP_NAME || 'EstudeMy';

export const generateSecret = (email: string) => {
  const issuer = appLabel();
  return speakeasy.generateSecret({
    length: 20,
    name: `${issuer} (${email})`,
    issuer,
  });
};

export const verifyToken = (secret: string, token: string) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  });
};