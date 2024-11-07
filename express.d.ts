// express.d.ts
import { RedisAscoltatore } from "ascoltatori";
import { RedisClient } from "redis";

declare global {
  namespace Express {
    interface Application {
      redis?: {
        client?: RedisClient;
      };
      ascoltatore?: RedisAscoltatore;
      helpers?: {
        winston: any; // Use specific type if available, such as Logger from winston
      };
      controllers?: {
        coap_api?: (req: any, res: any) => void;
        mqtt_api?: (client: any) => void;
        socket_api?: (socket: any) => void;
        http_api?: (req: any, res: any, next: any) => void;
      };
    }
  }
}
