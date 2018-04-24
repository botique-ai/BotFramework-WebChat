import * as React from "react";
import { IDoCardAction, classList } from "../Chat";
import { AdaptiveCardButtons } from "./AdaptiveCardButtons";
import { CardAction } from "@botique/botframework-directlinejs/built/directLine";

export interface HeroCardPropTypes {
  image?: string;
  imageRatio?: "horizontal" | "square";
  className?: string;
  title: string;
  subtitle?: string;
  buttons: Array<CardAction>;
  onCardAction: IDoCardAction;
  onImageLoad: () => void;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

export class HeroCard extends React.Component<HeroCardPropTypes, null> {
  componentDidUpdate() {
    if (this.props.onImageLoad) {
      this.props.onImageLoad();
    }
  }

  render() {
    return (
      <div
        className={classList(
          "wc-wide",
          "wc-card",
          "wc-card-hero",
          this.props.className
        )}
      >
        {this.props.image && (
          <div
            className={`img-container ${this.props.imageRatio || "horizontal"}`}
          >
            <img src={this.props.image} />
          </div>
        )}
        <div className="wc-card-hero-text-container">
          {this.props.title && (
            <div className="wc-card-hero-title">{this.props.title}</div>
          )}

          {this.props.subtitle && (
            <div className="wc-card-hero-subtitle">{this.props.subtitle}</div>
          )}
          {this.props.buttons && (
            <div className="wc-card-hero-buttons">
              <AdaptiveCardButtons
                buttons={this.props.buttons}
                onButtonClick={this.props.onCardAction}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
}
