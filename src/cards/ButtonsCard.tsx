import * as React from "react";
import { IDoCardAction, classList } from "../Chat";
import { CardAction } from "@botique/botframework-directlinejs/built/directLine";
import { AdaptiveCardButtons } from "./AdaptiveCardButtons";
import { DirectionDetector } from "../helpers/DirectionDetector";

export interface ButtonsCardPropTypes {
  buttons: Array<CardAction>;
  onCardAction: IDoCardAction;
  className?: string;
  text?: string;
}

export class ButtonsCard extends React.Component<ButtonsCardPropTypes, null> {
  render() {
    return (
      <div
        className={classList(
          "wc-wide",
          "wc-card",
          "wc-card-buttons",
          this.props.className
        )}
      >
        <div className="wc-card-buttons-text-container">
          {this.props.text && (
            <DirectionDetector text={this.props.text}>
              {(direction: "rtl" | "ltr") => (
                <div className={classList(`wc-card-buttons-text`, direction)}>
                  {this.props.text}
                </div>
              )}
            </DirectionDetector>
          )}

          <AdaptiveCardButtons
            buttons={this.props.buttons}
            onButtonClick={this.props.onCardAction}
          />
        </div>
      </div>
    );
  }
}
