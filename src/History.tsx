import * as React from 'react';
import { Activity, Message, User, CardActionTypes } from '@botique/botframework-directlinejs';
import { ChatState, FormatState, SizeState, showNotificationModal, sendLocation } from './Store';
import { Dispatch, connect } from 'react-redux';
import { ActivityView } from './ActivityView';
import { classList, doCardAction, IDoCardAction } from './Chat';
import * as konsole from './Konsole';
import { sendMessage } from './Store';
import { Spinner } from './Spinner';
import { isRTL } from './helpers/isRTL';
import {generateShellLineCountClass} from './helpers/generateShellLineCountClass';
import { NON_BUBBLE_ATTACHMENT_TYPES } from './Attachment';

export interface HistoryProps {
    format: FormatState,
    size: SizeState,
    shellLines: number,
    activities: Activity[],
    lastSubmittedActivityId: string,
    isLoadingHistory: boolean,
    isHistoryFullyLoaded: boolean,

    setMeasurements: (carouselMargin: number) => void,
    onClickRetry: (activity: Activity) => void,
    onClickCardAction: () => void,
    onLoadHistory: (limit: number) => void,

    isFromMe: (activity: Activity) => boolean,
    isSelected: (activity: Activity) => boolean,
    onClickActivity: (activity: Activity) => React.MouseEventHandler<HTMLDivElement>,
    doCardAction: IDoCardAction;
    userMessagesStyle?: {
      backgroundColor: string;
      color: string;
    }
}

const LOAD_HISTORY_LIMIT = 10;

// This value should be at least as big as the history container :before element ($actionsHeight scss var)
const BOTTOM_SCROLL_TOLERANCE = 40;

export class HistoryView extends React.Component<HistoryProps, {}> {
    private scrollMe: HTMLDivElement;
    private scrollContent: HTMLDivElement;
    private scrollToBottom = true;
    private lastScrollHeight: number;
    private lastScrollTop: number;

    private carouselActivity: WrappedActivity;
    private largeWidth: number;
    private lastScrolledActivityId: string;

    constructor(props: HistoryProps) {
        super(props);
    }

    componentWillUpdate() {
        this.scrollToBottom = (Math.abs(this.scrollMe.scrollHeight - this.scrollMe.scrollTop - this.scrollMe.offsetHeight) <= BOTTOM_SCROLL_TOLERANCE);
        this.lastScrollHeight = this.scrollMe.scrollHeight;
        this.lastScrollTop = this.scrollMe.scrollTop;
    }

    componentDidUpdate() {
        if (this.props.format.carouselMargin == undefined) {
            // After our initial render we need to measure the carousel width

            // Measure the message padding by subtracting the known large width
            const paddedWidth = measurePaddedWidth(this.carouselActivity.messageDiv) - this.largeWidth;

            // Subtract the padding from the offsetParent's width to get the width of the content
            const maxContentWidth = (this.carouselActivity.messageDiv.offsetParent as HTMLElement).offsetWidth - paddedWidth;

            // Subtract the content width from the chat width to get the margin.
            // Next time we need to get the content width (on a resize) we can use this margin to get the maximum content width
            const carouselMargin = this.props.size.width - maxContentWidth;

            konsole.log('history measureMessage ' + carouselMargin);

            // Finally, save it away in the Store, which will force another re-render
            this.props.setMeasurements(carouselMargin)

            this.carouselActivity = null; // After the re-render this activity doesn't exist
        }

        this.autoscroll();
    }

    private autoscroll() {
        const vAlignBottomPadding = Math.max(0, measurePaddedHeight(this.scrollMe) - this.scrollContent.offsetHeight);
        this.scrollContent.style.marginTop = vAlignBottomPadding + 'px';

        const lastActivity = this.props.activities[this.props.activities.length - 1];
        const lastActivityFromMe = this.props.lastSubmittedActivityId && (this.props.lastSubmittedActivityId !== this.lastScrolledActivityId)

        // Validating if we are at the bottom of the list or the last activity was triggered by the user.
        if (this.scrollToBottom || lastActivityFromMe) {
            this.scrollMe.scrollTop = this.scrollMe.scrollHeight - this.scrollMe.offsetHeight;
            this.lastScrolledActivityId = this.props.lastSubmittedActivityId;
        } else if(this.scrollMe.scrollHeight !== this.lastScrollHeight){
            // Stay in the same scroll position as before
            this.scrollMe.scrollTop = this.lastScrollTop + (this.scrollMe.scrollHeight - this.lastScrollHeight);
        }
    }

    // In order to do their cool horizontal scrolling thing, Carousels need to know how wide they can be.
    // So, at startup, we create this mock Carousel activity and measure it.
    private measurableCarousel = () =>
        // find the largest possible message size by forcing a width larger than the chat itself
        <WrappedActivity
            ref={ x => this.carouselActivity = x }
            activity={ {
                type: 'message',
                id: '',
                from: { id: '' },
                attachmentLayout: 'carousel'
            } }
            format={ null }
            fromMe={ false }
            onClickActivity={ null }
            onClickRetry={ null }
            selected={ false }
            showTimestamp={ false }
        >
            <div style={ { width: this.largeWidth } }>&nbsp;</div>
        </WrappedActivity>;

    // At startup we do three render passes:
    // 1. To determine the dimensions of the chat panel (not much needs to actually render here)
    // 2. To determine the margins of any given carousel (we just render one mock activity so that we can measure it)
    // 3. (this is also the normal re-render case) To render without the mock activity

    private doCardAction(type: CardActionTypes, value: string | object) {
        this.props.onClickCardAction();
        return this.props.doCardAction(type, value);
    }

    private handleScroll(){
        if(this.scrollMe.scrollTop < 30 && !this.props.isLoadingHistory && !this.props.isHistoryFullyLoaded){
            this.props.onLoadHistory(LOAD_HISTORY_LIMIT);
        }
    }

    private renderSpinner(){
        return(
            <div className="wc-message-groups-spinner-container"><Spinner/></div>
        )
    }

    render() {
        konsole.log("History props", this);
        let content;
        if (this.props.size.width !== undefined) {
            if (this.props.format.carouselMargin === undefined) {
                // For measuring carousels we need a width known to be larger than the chat itself
                this.largeWidth = this.props.size.width * 2;
                content = <this.measurableCarousel/>;
            } else {
                content =  this.props.activities.filter((v)=> v.type !== "event").map((activity, index) =>
                    <WrappedActivity
                        format={ this.props.format }
                        key={ activity.channelData.clientActivityId }
                        activity={ activity }
                        showTimestamp={ index === this.props.activities.length - 1 || (index + 1 < this.props.activities.length && suitableInterval(activity, this.props.activities[index + 1])) }
                        selected={ this.props.isSelected(activity) }
                        fromMe={ this.props.isFromMe(activity) }
                        onClickActivity={ this.props.onClickActivity(activity) }
                        onClickRetry={ e => {
                            // Since this is a click on an anchor, we need to stop it
                            // from trying to actually follow a (nonexistent) link
                            e.preventDefault();
                            e.stopPropagation();
                            this.props.onClickRetry(activity)
                        } }
                        userMessagesStyle={this.props.userMessagesStyle}
                    >
                        <ActivityView
                            format={ this.props.format }
                            size={ this.props.size }
                            activity={ activity }
                            onCardAction={ (type: CardActionTypes, value: string | object) => this.doCardAction(type, value) }
                            onImageLoad={ () => this.autoscroll() }
                        />
                    </WrappedActivity>
                );
            }
        }

        const groupsClassName = classList('wc-message-groups', !this.props.format.options.showHeader && 'no-header', generateShellLineCountClass(this.props.shellLines));

        return (
            <div onScroll={this.handleScroll.bind(this)} className={ groupsClassName } ref={ div => this.scrollMe = div || this.scrollMe }>
                {this.props.isLoadingHistory && this.renderSpinner()}
                <div className="wc-message-group-content" ref={ div => { if (div) this.scrollContent = div }}>
                    { content }
                </div>
            </div>
        );
    }
}

export const History = connect(
    (state: ChatState) => ({
        // passed down to HistoryView
        format: state.format,
        size: state.size,
        activities: state.history.activities,
        lastSubmittedActivityId: state.history.lastSubmittedActivityId,
        shellLines: state.shell.lines,
        // only used to create helper functions below
        connectionSelectedActivity: state.connection.selectedActivity,
        selectedActivity: state.history.selectedActivity,
        isLoadingHistory: state.history.isLoadingHistory,
        isHistoryFullyLoaded: state.history.isHistoryFullyLoaded,
        botConnection: state.connection.botConnection,
        user: state.connection.user,
    }), {
        setMeasurements: (carouselMargin: number) => ({ type: 'Set_Measurements', carouselMargin }),
        onClickRetry: (activity: Activity) => ({ type: 'Send_Message_Retry', clientActivityId: activity.channelData.clientActivityId }),
        onLoadHistory: (limit: number) => ({ type: 'Get_History_Try', limit }),
        onClickCardAction: () => ({ type: 'Card_Action_Clicked'}),
        // only used to create helper functions below
        sendMessage,
        sendLocation,
        showNotificationModal,
    }, (stateProps: any, dispatchProps: any, ownProps: any): HistoryProps => ({
        // from stateProps
        isLoadingHistory: stateProps.isLoadingHistory,
        isHistoryFullyLoaded: stateProps.isHistoryFullyLoaded,
        format: stateProps.format,
        size: stateProps.size,
        activities: stateProps.activities,
        lastSubmittedActivityId: stateProps.lastSubmittedActivityId,
        shellLines: stateProps.shellLines,
        // from dispatchProps
        setMeasurements: dispatchProps.setMeasurements,
        onClickRetry: dispatchProps.onClickRetry,
        onClickCardAction: dispatchProps.onClickCardAction,
        onLoadHistory: dispatchProps.onLoadHistory,

        userMessagesStyle: ownProps.userMessagesStyle,

        // helper functions
        doCardAction: doCardAction(stateProps.botConnection, stateProps.user, stateProps.format.locale, dispatchProps.sendMessage, dispatchProps.sendLocation, dispatchProps.showNotificationModal),
        isFromMe: (activity: Activity) => activity.from.id === stateProps.user.id,
        isSelected: (activity: Activity) => activity === stateProps.selectedActivity,
        onClickActivity: (activity: Activity) => stateProps.connectionSelectedActivity && (() => stateProps.connectionSelectedActivity.next({ activity }))
    })
)(HistoryView);

const getComputedStyleValues = (el: HTMLElement, stylePropertyNames: string[]) => {
    const s = window.getComputedStyle(el);
    const result: { [key: string]: number } = {};
    stylePropertyNames.forEach(name => result[name] = parseInt(s.getPropertyValue(name)));
    return result;
}

const measurePaddedHeight = (el: HTMLElement): number => {
    const paddingTop = 'padding-top', paddingBottom = 'padding-bottom';
    const values = getComputedStyleValues(el, [paddingTop, paddingBottom]);
    return el.offsetHeight - values[paddingTop] - values[paddingBottom];
}

const measurePaddedWidth = (el: HTMLElement): number => {
    const paddingLeft = 'padding-left', paddingRight = 'padding-right';
    const values = getComputedStyleValues(el, [paddingLeft, paddingRight]);
    return el.offsetWidth + values[paddingLeft] + values[paddingRight];
}

const suitableInterval = (current: Activity, next: Activity) =>
    Date.parse(next.timestamp) - Date.parse(current.timestamp) > 5 * 60 * 1000;

export interface WrappedActivityProps {
    activity: Activity,
    showTimestamp: boolean,
    selected: boolean,
    fromMe: boolean,
    format: FormatState,
    onClickActivity: React.MouseEventHandler<HTMLDivElement>,
    onClickRetry: React.MouseEventHandler<HTMLAnchorElement>;
    userMessagesStyle?: {
      backgroundColor: string;
      color: string;
    }
}

export class WrappedActivity extends React.Component<WrappedActivityProps, null> {
    public messageDiv: HTMLDivElement;
    private isRTL: boolean = false;
    private isBubbleWrapped: boolean = true;
    private timestampTimerHandle: any;

    constructor(props: WrappedActivityProps) {
        super(props);
        this.detectRTL(props.activity);
        this.detectBubble(props.activity);
    }

    componentWillUpdate(nextProps: WrappedActivityProps){
        this.detectRTL(nextProps.activity);
        this.detectBubble(nextProps.activity);
    }

    detectRTL(activity: Activity){
        if(activity.type === 'message' && activity.text){
            this.isRTL = isRTL(activity.text)
        }
    }

    detectBubble(activity: Activity){
        if(activity.type === 'message' && activity.attachments && activity.attachments.length > 0 && activity.attachments.every(
            ({contentType}) => NON_BUBBLE_ATTACHMENT_TYPES.indexOf(contentType) > -1
        )){
            this.isBubbleWrapped = false;
        } else {
            this.isBubbleWrapped = true;
        }
    }

    render () {
        let timeLine: JSX.Element;
        switch (this.props.activity.id) {
            case undefined:
                timeLine = <span>{ this.props.format.strings.messageSending }</span>;
                break;
            case null:
                timeLine = <span>{ this.props.format.strings.messageFailed }</span>;
                break;
            case "retry":
                timeLine =
                    <span>
                        { this.props.format.strings.messageFailed }
                        { ' ' }
                        <a href="." onClick={ this.props.onClickRetry }>{ this.props.format.strings.messageRetry }</a>
                    </span>;
                break;
            default:
                let sent: string;
                if (this.props.showTimestamp){
                    const activityDate = new Date(this.props.activity.timestamp);
                    const today = (new Date());
                    today.setHours(0, 0, 0, 0);
                    if(this.props.showTimestamp){
                        const stringFormatOptions = (activityDate < today) ? {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit', 
                            minute:'2-digit'
                        } : {
                            hour: '2-digit', 
                            minute:'2-digit'
                        }
                        timeLine = <span>{ activityDate.toLocaleString(this.props.format.locale, stringFormatOptions) }</span>;
                    }
                }
                break;
        }

        const who = this.props.fromMe ? 'me' : 'bot';

        const wrapperClassName = classList(
            'wc-message-wrapper',
            (this.props.activity as Message).attachmentLayout || 'list',
            this.props.onClickActivity && 'clickable'
        );

        const contentClassName = classList(
            'wc-message-content',
            this.props.selected && 'selected',
            this.isRTL && 'rtl',
            this.isBubbleWrapped && 'bubble'
        );

        const contentStyle = who === "me" ? (this.props.userMessagesStyle || {}) : {};
        const pathStyle = who === "me" ? (this.props.userMessagesStyle ? {fill: this.props.userMessagesStyle.backgroundColor} : {}) : {};

        return (
            <div data-activity-id={ this.props.activity.id } className={ wrapperClassName } onClick={ this.props.onClickActivity }>
                <div
                    className={ 'wc-message wc-message-from-' + who } ref={ div => this.messageDiv = div }>
                    <div className={ contentClassName } style={contentStyle}>
                    {
                       this.isBubbleWrapped &&
                        <svg className="wc-message-callout">
                            <path className="point-left" d="m0,6 l6 6 v-12 z" style={pathStyle} />
                            <path className="point-right" d="m6,6 l-6 6 v-12 z" style={pathStyle} />
                        </svg>
                    }
                        { this.props.children }
                    </div>
                </div>
                <div className={ `wc-message-from wc-message-from-${who}` }>{ timeLine }</div>
            </div>
        );
    }
}
