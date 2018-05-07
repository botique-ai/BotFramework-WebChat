import * as React from "react";
import Collapse, { Panel } from "rc-collapse";
import { IDoCardAction, classList } from "../Chat";
import {
  CardAction,
  ListCardItem
} from "@botique/botframework-directlinejs/built/directLine";
import { AdaptiveCardButtons } from "./AdaptiveCardButtons";
import { DirectionDetector } from "../helpers/DirectionDetector";

export interface ListCardPropTypes {
  title?: string;
  items: Array<ListCardItem>;
  onCardAction: IDoCardAction;
  className?: string;
}

export class ListCard extends React.Component<ListCardPropTypes, null> {
  render() {
    return (
      <div
        className={classList(
          "wc-wide",
          "wc-card",
          "wc-card-list",
          this.props.className
        )}
      >
        {this.props.title && (
          <div className="wc-card-list-title">{this.props.title}</div>
        )}

        <div className="wc-card-list-items">
          <Collapse accordion={true}>
            {this.props.items.map((listCardItem: ListCardItem, i) => (
              <Panel key={i} header={listCardItem.title}>
                {listCardItem.text}
              </Panel>
            ))}
          </Collapse>
        </div>

        {/* {this.props.text && (
            <DirectionDetector text={this.props.text}>
              {(direction: "rtl" | "ltr") => (
                <div className={classList(`wc-card-buttons-text`, direction)}>
                  {this.props.text}
                </div>
              )}
            </DirectionDetector>
          )} */}

        {/* <div className="wc-card-buttons-buttons">
            <AdaptiveCardButtons
              buttons={this.props.buttons}
              onButtonClick={this.props.onCardAction}
            />
          </div> */}
      </div>
    );
  }
}
