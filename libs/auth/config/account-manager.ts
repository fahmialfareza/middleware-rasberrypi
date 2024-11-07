import crypto from "crypto";
import { Database } from "sqlite3";
import { RequestCallback, Account, NewAccountData } from "./types";
import * as TM from "./things-manager";

const db: Database = require("../db/db");

/* Public methods */

/* Auto login validation methods */
export const autoLogin = (
  user: string,
  pass: string,
  callback: RequestCallback<Account | null>
) => {
  db.get("SELECT * FROM accounts WHERE username=?", user, (e, o) => {
    if (o && o.approved === 1) {
      o.pass === pass ? callback(null, o) : callback(null, null);
    } else {
      callback(null, null);
    }
  });
};

/* Manual login validation methods */
export const manualLogin = (
  user: string,
  pass: string,
  callback: RequestCallback<Account | string>
) => {
  db.get("SELECT * FROM accounts WHERE username=?", user, (e, o) => {
    if (o) {
      if (o.approved === 1) {
        validatePassword(pass, o.password, (err, res) => {
          if (res) {
            callback(null, o);
          } else {
            callback("invalid-password", null);
          }
        });
      } else {
        callback("not-approved", null);
      }
    } else {
      callback("user-not-found", null);
    }
  });
};

/* Generator cookie (Login Key) methods */
export const generateLoginKey = (
  user: string,
  ipAddress: string,
  callback: (cookie: string) => void
) => {
  const cookie = guid();
  db.run(
    "UPDATE accounts SET ip=?, cookie=? WHERE username=?",
    [ipAddress, cookie, user],
    () => {
      callback(cookie);
    }
  );
};

/* Validator cookie (Login Key) methods */
export const validateLoginKey = (
  cookie: string,
  ipAddress: string,
  callback: RequestCallback<Account | null>
) => {
  db.get(
    "SELECT username, password FROM accounts WHERE cookie=? AND ip=?",
    [cookie, ipAddress],
    (e, o) => {
      callback(null, o);
    }
  );
};

/* Insertion methods */
export const addNewAccount = (
  newData: NewAccountData,
  callback: (status: string | null, data?: any) => void
) => {
  db.serialize(() => {
    const query1 = "SELECT username FROM accounts WHERE username=?";
    const query2 = "SELECT email FROM accounts WHERE email=?";
    const query3 =
      'INSERT INTO accounts (name, email, username, password, ip, admin, date) VALUES (?, ?, ?, ?, ?, ?, datetime("now", "localtime"))';

    db.get(query1, [newData.username], (err, row) => {
      if (err) throw err;
      if (row) {
        callback("username-taken");
      } else {
        db.get(query2, newData.email, (err, row) => {
          if (row) {
            callback("email-taken");
          } else {
            saltAndHash(newData.password, (hash) => {
              newData.password = hash;
              newData.date = new Date().toLocaleString();
              const admin = newData.admin === "true" ? 1 : 0;
              db.run(
                query3,
                [
                  newData.name,
                  newData.email,
                  newData.username,
                  newData.password,
                  newData.ip,
                  admin,
                ],
                callback
              );
            });
          }
        });
      }
    });
  });
};

/* Update methods */
export const updateAccount = (
  newData: Partial<NewAccountData>,
  callback: RequestCallback<Account>
) => {
  const findOneAndUpdate = (data: Partial<NewAccountData>) => {
    const { name, email } = data;

    if (data.password) {
      db.run(
        "UPDATE accounts SET name=?, email=?, password=? WHERE username=?",
        [name, email, data.password, data.username]
      );
    } else {
      db.run("UPDATE accounts SET name=?, email=? WHERE username=?", [
        name,
        email,
        data.username,
      ]);
    }

    db.get(
      "SELECT name, email, username, date FROM accounts WHERE username=?",
      [data.username],
      (e, o) => {
        callback(null, o);
      }
    );
  };

  if (newData.password === "") {
    findOneAndUpdate(newData);
  } else {
    if (newData.password) {
      saltAndHash(newData.password, (hash) => {
        newData.password = hash;
        findOneAndUpdate(newData);
      });
    }
  }
};

/* Delete methods */
export const deleteAccount = (
  username: string,
  callback: RequestCallback<void>
) => {
  db.run("DELETE FROM accounts WHERE username=?", username, (err) => {
    if (err) {
      callback(err, null);
    } else {
      TM.deleteThings(null, username, (err) => {
        callback(err, null);
      });
    }
  });
};

/* Account lookup methods */
export const getAllRecords = (callback: RequestCallback<Account[]>) => {
  db.all(
    "SELECT name, email, username, date, admin, approved FROM accounts",
    (err, row) => {
      callback(err, row);
    }
  );
};

export const approveAccount = (
  username: string,
  callback: RequestCallback<void>
) => {
  db.run("UPDATE accounts SET approved=1 WHERE username=?", username, callback);
};

export const declineAccount = (
  username: string,
  callback: RequestCallback<void>
) => {
  db.run("UPDATE accounts SET approved=0 WHERE username=?", username, callback);
};

/* Private methods */
const generateSalt = (): string => {
  const set =
    "0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ";
  let salt = "";
  for (let i = 0; i < 10; i++) {
    const p = Math.floor(Math.random() * set.length);
    salt += set[p];
  }
  return salt;
};

const md5 = (str: string): string => {
  return crypto.createHash("md5").update(str).digest("hex");
};

const saltAndHash = (pass: string, callback: (hash: string) => void) => {
  const salt = generateSalt();
  callback(salt + md5(pass + salt));
};

const validatePassword = (
  plainPass: string,
  hashedPass: string,
  callback: (err: null | string, isValid: boolean) => void
) => {
  const salt = hashedPass.substr(0, 10);
  const validHash = salt + md5(plainPass + salt);
  callback(null, hashedPass === validHash);
};

const guid = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
