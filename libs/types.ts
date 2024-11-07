// types.ts

import { Logger } from "winston";

// Define the structure of DataModel
export interface DataModel {
  findOrCreate: (topic: string, payload: Buffer) => void;
  find: (
    topic: string,
    callback: (err: string | null, data: { value: Buffer | string }) => void
  ) => void;
  subscribe: (
    topic: string,
    listener: (data: { value: Buffer | string }) => void
  ) => void;
}

// Define the structure of ThingsManager
export interface ThingsManager {
  validity: (
    token: string,
    callback: (
      err: string | null,
      reply: { status: boolean; data: any }
    ) => void
  ) => void;
  buildTopic: (
    things_id: string,
    topic: string,
    callback: (err: string | null, result: string) => void
  ) => void;
  saveTopic: (things_id: string, topic: string) => void;
}

// Extend CoAP-specific properties for Request and Response
export interface CoapRequest {
  url?: string;
  rsinfo: {
    address: string;
  };
  method: string;
  payload: string;
  headers: {
    [key: string]: any;
    Observe?: number;
  };
}

export interface CoapResponse {
  code: string;
  end: (payload: string) => void;
  write: (payload: string) => void;
  reset: () => void;
}

// Define the structure of App with helpers and models
export interface App {
  helpers: {
    winston: Logger;
  };
  models: {
    Data: DataModel;
  };
}

// Extend the Winston Logger to add a `coap` method
export interface ExtendedLogger extends Logger {
  coap: (message: string, ...meta: any[]) => void;
}
