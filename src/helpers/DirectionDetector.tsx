import * as React from "react";
import { isRTL } from "./isRTL";

export interface DirectionDetectorProps {
  text: string;
  children: (direction: "ltr" | "rtl") => any;
}

export class DirectionDetector extends React.PureComponent<
  DirectionDetectorProps,
  any
> {
  render() {
    return this.props.children(isRTL(this.props.text) ? "rtl" : "ltr");
  }
}
