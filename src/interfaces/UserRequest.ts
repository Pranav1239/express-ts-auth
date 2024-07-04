export type UserRequest = {
  id: string;
  mobileNumber: string;
  password: string;
  otp: string | null;
  createdAt: Date;
  updatedAt: Date;
};
