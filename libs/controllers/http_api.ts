import { Request, Response, Router } from "express";
import { App } from "../types"; // Assuming you have `App` defined in `types.ts`

module.exports = (app: App): Router => {
  const logger = app.helpers.winston;
  const router = Router();
  const AM = require("../auth/config/account-manager");
  const TM = require("../auth/config/things-manager");

  // Define other types and utility functions as needed

  // Helper to strip `::ffff:` prefix from IP addresses
  const sanitizeIp = (ip: string): string =>
    ip.startsWith("::ffff:") ? ip.slice(7) : ip;

  // Utility for consistent responses
  const jsonResponse = (
    res: Response,
    code: number,
    message: string,
    additionalData = {}
  ) => {
    res.status(code).json({ message, ...additionalData });
  };

  router.route("/things/request").post((req: Request, res: Response) => {
    const ip = sanitizeIp(req.ip!);
    logger.http("Incoming request from %s", ip);

    if (!req.body) {
      return jsonResponse(res, 401, "Things-not-Registered");
    }

    const payload = { ...req.body, ip, timestamp: Date.now().toString() };

    TM.request(payload, (err: string | null, data: any) => {
      if (err) {
        logger.http("Error generating token for %s: %s", ip, err);
        return jsonResponse(res, 401, err);
      }

      logger.http("Token generated for %s", ip);
      jsonResponse(res, 200, "Token generated", { token: data });
    });
  });

  router.route("/things/check").get((req: Request, res: Response) => {
    const ip = sanitizeIp(req.ip!);
    logger.http("Incoming token check request from %s", ip);

    if (!req.body.token) {
      return jsonResponse(res, 200, "Token-not-found");
    }

    TM.validity(req.body.token, (err: string | null, reply: any) => {
      if (err) {
        logger.error("Error validating token: %s", err);
        return jsonResponse(res, 401, err);
      }

      if (reply.status) {
        jsonResponse(res, 200, "Valid", {
          status: reply.status,
          message: reply,
        });
      } else {
        jsonResponse(res, 200, "Invalid");
      }
    });
  });

  router
    .route("/signup")
    .get((req: Request, res: Response) => {
      res.render("signup", { title: "Signup" });
    })
    .post((req: Request, res: Response) => {
      const { name, email, username, password, checkbox } = req.body;

      AM.addNewAccount(
        { name, email, username, password, admin: checkbox },
        (err: string | null) => {
          if (err) {
            return jsonResponse(res, 400, err);
          }

          logger.http("User %s has registered", username);
          jsonResponse(res, 200, "ok");
        }
      );
    });

  router.route("/dashboard").get((req: Request, res: Response) => {
    //   @ts-ignore
    if (!req.session.user) {
      return res.redirect("/");
    }

    TM.getThings(
      //   @ts-ignore
      req.session.user.username,
      (err: string | null, things: any) => {
        if (err) {
          return res.render("error", {
            title: "Error",
            message: "Failed to load dashboard.",
          });
        }

        res.render("dashboard", {
          title: "Dashboard",
          things,
          //   @ts-ignore
          usr: req.session.user,
        });
      }
    );
  });

  // Add more routes following similar patterns
  return router;
};
