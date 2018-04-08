import {CardAction} from "@botique/botframework-directlinejs";

export type ChatMenuItem = CardAction | {
  title: string;
  subMenu:ChatMenu
};

export type ChatMenu = Array<ChatMenuItem>;
