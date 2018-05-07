import * as React from "react";
import { CardAction } from "@botique/botframework-directlinejs";
import { IDoCardAction } from "../Chat";

export interface AdaptiveCardButtonsPropTypes {
  buttons: Array<CardAction>;
  onButtonClick: IDoCardAction;
}

export const AdaptiveCardButtons = ({
  buttons,
  onButtonClick
}: AdaptiveCardButtonsPropTypes) => (
  <div className="adaptive-card-buttons">
    {buttons.map(button => (
      <button
        key={button.title}
        onClick={() =>
          /openUrl/i.test(button.type)
            ? window.open((button as any).url) // https://docs.microsoft.com/en-us/adaptive-cards/create/cardschema#actionopenurl
            : onButtonClick(button.type, button.value)
        }
      >
        {button.title}
      </button>
    ))}
  </div>
);
