// types.ts

// Define the type for an Account
export interface Account {
  id?: number;
  name: string;
  email: string;
  username: string;
  password: string;
  ip?: string;
  admin?: number;
  date?: string;
  approved?: number;
}

// Define the type for new account data
export interface NewAccountData {
  date: string;
  name: string;
  email: string;
  username: string;
  password: string;
  ip: string;
  admin: string; // this may be converted later in the code to a number (0 or 1)
}

// Define a type for callback functions used in database requests
export type RequestCallback<T> = (
  error: string | null,
  result: T | null
) => void;
