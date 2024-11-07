import jwt, { VerifyErrors, JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { Database } from "sqlite3";

const db: Database = require("../db/db");

interface Payload {
  things_id: string;
  things_password: string;
  ip: string;
  timestamp: string;
}

interface Docs {
  description: any;
  things_password: string;
  topic_id: string;
  user: any;
  things_id: string;
  things_name: string;
  role: string;
  token?: string;
  ip?: string;
  timestamp?: string;
}

type RequestCallback<T> = (error: string | null, result: T | null) => void;

/* Request Token */
export const request = (
  payload: Payload,
  callback: RequestCallback<string>
) => {
  db.get(
    "SELECT * FROM things WHERE things_id=? AND things_password=?",
    [payload.things_id, payload.things_password],
    (err, docs: Docs) => {
      if (err) return callback(err, null);

      if (docs) {
        if (docs.token) {
          checkToken(docs.token, (err, reply) => {
            if (err) {
              // @ts-ignore
              if (err.name === "TokenExpiredError") {
                docs.ip = payload.ip;
                docs.timestamp = payload.timestamp;
                generateToken(docs, callback);
              }
            } else {
              callback("Already-has-token", null);
            }
          });
        } else {
          docs.ip = payload.ip;
          docs.timestamp = payload.timestamp;
          generateToken(docs, callback);
        }
      } else {
        callback("Things-not-Registered", null);
      }
    }
  );
};

export const validity = (
  token: string,
  callback: RequestCallback<{ status: boolean; data?: JwtPayload }>
) => {
  checkToken(token, (err, reply) => {
    if (err) {
      return callback(err, { status: false });
    }

    db.get(
      "SELECT things_id FROM things WHERE things_id=?",
      reply?.things_id,
      (e, o) => {
        if (o) {
          callback(null, { status: true, data: reply });
        } else {
          callback(e || "Invalid ID", { status: false });
        }
      }
    );
  });
};

export const addThings = (
  dataThings: Docs,
  callback: (status: string | null) => void
) => {
  db.get(
    "SELECT * FROM things WHERE things_name=? AND user=?",
    [dataThings.things_name, dataThings.user],
    (err, dvc) => {
      if (dvc) {
        callback("things-name-taken");
      } else {
        const tempId = hashing(dataThings.things_name, Date.now().toString());
        db.get(
          "SELECT things_id FROM things WHERE things_id=?",
          tempId,
          (err, rep) => {
            if (rep) {
              dataThings.things_id = hashing(
                dataThings.things_name,
                Date.now().toString()
              );
            } else {
              dataThings.things_id = tempId;
            }

            dataThings.topic_id = generateTopicId();
            dataThings.things_password = hashing(
              dataThings.user,
              Date.now().toString()
            );

            db.run(
              'INSERT INTO things (things_name, role, description, user, things_id, things_password, topic_id, date) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
              [
                dataThings.things_name,
                dataThings.role,
                dataThings.description,
                dataThings.user,
                dataThings.things_id,
                dataThings.things_password,
                dataThings.topic_id,
              ],
              callback
            );
          }
        );
      }
    }
  );
};

export const updateThings = (
  newData: Partial<Docs>,
  callback: RequestCallback<void>
) => {
  db.run(
    "UPDATE things SET role=?, description=? WHERE things_id=?",
    [newData.role, newData.description, newData.things_id],
    callback
  );
};

export const checkId = (id: string, callback: RequestCallback<Docs>) => {
  db.get(
    "SELECT things_name, things_id, things_password, role, description, user, date, topic FROM things WHERE things_id=?",
    id,
    callback
  );
};

export const getThings = (user: string, callback: RequestCallback<Docs[]>) => {
  db.all(
    "SELECT things_name, things_id, things_password, role, description, user, date, topic FROM things WHERE user=?",
    user,
    callback
  );
};

export const getAllThings = (callback: RequestCallback<Docs[]>) => {
  db.all(
    "SELECT things_name, things_id, things_password, role, description, user, date, topic FROM things",
    callback
  );
};

export const deleteThings = (
  id: string | null,
  user: string | null,
  callback: RequestCallback<void>
) => {
  if (id) {
    db.run("DELETE FROM things WHERE things_id=?", id, callback);
  } else if (user) {
    db.run("DELETE FROM things WHERE user=?", user, callback);
  }
};

export const saveTopic = (things_id: string, topic: string) => {
  db.run("UPDATE things SET topic=? WHERE things_id=?", [topic, things_id]);
};

export const deleteTopic = (things_id: string) => {
  db.run("UPDATE things SET topic=null WHERE things_id=?", things_id);
};

export const buildTopic = (
  things_id: string,
  topic: string,
  callback: RequestCallback<string>
) => {
  db.get("SELECT topic_id FROM things WHERE things_id=?", things_id, (e, o) => {
    if (o) {
      callback(null, `${o.topic_id}/${topic}`);
    } else {
      callback(null, e || "Topic ID not found");
    }
  });
};

/* Helper Functions */
const generateTopicId = (): string => {
  // @ts-ignore
  return crypto.randomBytes(4).toString(process.env.ENCODE || "hex");
};

const hashing = (str: string, timestamp: string): string => {
  return (
    crypto
      .createHash("sha256")
      .update(`${str}-${timestamp}`)
      // @ts-ignore
      .digest(process.env.ENCODE || "hex")
  );
};

const checkToken = (token: string, callback: RequestCallback<JwtPayload>) => {
  jwt.verify(
    token,
    process.env.SECRET_KEY || "",
    (err: VerifyErrors | null, decoded: JwtPayload | undefined) => {
      callback(err ? err.message : null, decoded || null);
    }
  );
};

const generateToken = (docs: Docs, callback: RequestCallback<string>) => {
  const payload = {
    things_id: docs.things_id,
    things_name: docs.things_name,
    timestamp: docs.timestamp,
    role: docs.role,
  };

  jwt.sign(
    payload,
    process.env.SECRET_KEY || "",
    { expiresIn: process.env.EXP_TIME, issuer: process.env.ISSUER },
    (err, token) => {
      if (err || !token) {
        callback(err ? err.name : "Token generation failed", null);
      } else {
        db.run(
          "UPDATE things SET ip=?, timestamp=?, token=? WHERE things_id=?",
          [docs.ip, docs.timestamp, token, docs.things_id],
          (updateErr) => {
            if (updateErr) callback(updateErr.message, null);
          }
        );
        callback(null, token);
      }
    }
  );
};
