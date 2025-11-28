import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

type UserInfo = {
  name: string;
  color: string;
  picture: string;
};

export type Message = {
  id: string;
  text: string;
  sender: UserInfo;
  timestamp: number;
};

export type Layer = {
  type: "Rectangle" | "Ellipse" | "Line";
  x: number;
  y: number;
  height: number;
  width: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
};

export type UserAwareness = {
  user?: UserInfo;
};

export type AwarenessList = [number, UserAwareness][];

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: UserInfo; // Accessible through `user.info`
    };

    Presence: {
      cursor: { x: number; y: number } | null;
      selection: string[];
    };

    Storage: {
      messages: LiveList<Message>;
      layers: LiveMap<string, LiveObject<Layer>>;
      layerIds: LiveList<string>;
    };
  }
}
