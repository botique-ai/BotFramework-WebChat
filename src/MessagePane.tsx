import * as React from 'react';
import { Activity, CardAction, User, Message } from '@botique/botframework-directlinejs';
import * as Modal from 'react-modal';
import { ChatState, showNotificationModal, sendLocation } from './Store';
import { connect } from 'react-redux';
import { HScroll } from './HScroll';
import { classList, doCardAction, IDoCardAction } from './Chat';
import * as konsole from './Konsole';
import { ChatActions, sendMessage } from './Store';
import { isRTL } from './helpers/isRTL';
import { generateShellLineCountClass } from './helpers/generateShellLineCountClass';

export interface MessagePaneProps {
    activityWithSuggestedActions: Message,

    onSuggestedActionClick: (message: Message) => any,

    children: React.ReactNode,
    doCardAction: IDoCardAction,
    shellLines: number,
}

const MessagePaneView = (props: MessagePaneProps) =>
    <div className={ classList('wc-message-pane', props.activityWithSuggestedActions && 'show-actions' ) }>
        { props.children }
        <div className={`wc-suggested-actions ${generateShellLineCountClass(props.shellLines)}`}>
            <SuggestedActions { ... props }/>
        </div>
    </div>;

class SuggestedActions extends React.Component<MessagePaneProps, {}> {
    constructor(props: MessagePaneProps) {
        super(props);
    }

    async actionClick(e: React.MouseEvent<HTMLButtonElement>, cardAction: CardAction) {
        //"stale" actions may be displayed (see shouldComponentUpdate), do not respond to click events if there aren't actual actions
        if (!this.props.activityWithSuggestedActions) return;
        const activity = this.props.activityWithSuggestedActions;
        e.stopPropagation();

        // Do card action can reject, 
        if(await this.props.doCardAction(cardAction.type, cardAction.value)){
            this.props.onSuggestedActionClick(activity);
        };
    }

    shouldComponentUpdate(nextProps: MessagePaneProps) {
        //update only when there are actions. We want the old actions to remain displayed as it animates down.
        return !!nextProps.activityWithSuggestedActions;
    }

    render() {
        if (!this.props.activityWithSuggestedActions) return null;

        return (
            <HScroll
                prevSvgPathData="M 16.5 22 L 19 19.5 L 13.5 14 L 19 8.5 L 16.5 6 L 8.5 14 L 16.5 22 Z"
                nextSvgPathData="M 12.5 22 L 10 19.5 L 15.5 14 L 10 8.5 L 12.5 6 L 20.5 14 L 12.5 22 Z"
                scrollUnit="page"
            >
                <ul>{ this.props.activityWithSuggestedActions.suggestedActions.actions.map((action, index) =>
                    <li key={ `${action.title}-${index}` }>
                        { action.type === "location" ? 
                            <LocationAction onClick={this.actionClick.bind(this)} cardAction={action}/> : 
                            <TextAction onClick={this.actionClick.bind(this)} cardAction={action} />
                        }
                    </li>
                ) }</ul>
            </HScroll>
        );
    }
}

interface CardActionPropTypes{
    cardAction: CardAction, 
    onClick: (e: React.MouseEvent<HTMLButtonElement>, cardAction: CardAction) => any
}

const TextAction = ({cardAction, onClick}: CardActionPropTypes) => {
    return(
        <button className={`${isRTL(cardAction.title) ? 'rtl' : ''}`} type="button" onClick={ e => onClick(e, cardAction) } title={ cardAction.title }>
            { cardAction.title }
        </button>
    );
}

const LocationAction = ({cardAction, onClick}: CardActionPropTypes) => {
    return(
        <button type="button" onClick={ e => onClick(e, cardAction) } title="Send my location">
            📍 Send My Location
        </button>
    );
}

function activityWithSuggestedActions(activities: Activity[]) {
    if (!activities || activities.length === 0)
        return;
    const lastActivity = activities[activities.length - 1];
    if (lastActivity.type === 'message'
        && lastActivity.suggestedActions
        && lastActivity.suggestedActions.actions.length > 0
    )
        return lastActivity;
}


export const MessagePane = connect(
    (state: ChatState) => ({
        // passed down to MessagePaneView
        activityWithSuggestedActions: activityWithSuggestedActions(state.history.activities),
        // only used to create helper functions below
        botConnection: state.connection.botConnection,
        user: state.connection.user,
        locale: state.format.locale,
        shellLines: state.shell.lines
    }), {
        onSuggestedActionClick: (message: Message) => ({ type: 'Take_SuggestedAction', message } as ChatActions),
        // only used to create helper functions below
        sendMessage,
        sendLocation,
        showNotificationModal,
    }, (stateProps: any, dispatchProps: any, ownProps: any): MessagePaneProps => ({
        // from stateProps
        activityWithSuggestedActions: stateProps.activityWithSuggestedActions,
        shellLines: stateProps.shellLines,
        // from dispatchProps
        onSuggestedActionClick: (activity) => {
            dispatchProps.onSuggestedActionClick(activity);
            ownProps.onSuggestedActionClick(activity);
        },
        // from ownProps
        children: ownProps.children,
        // helper functions
        doCardAction: doCardAction(stateProps.botConnection, stateProps.user, stateProps.locale, dispatchProps.sendMessage, dispatchProps.sendLocation, dispatchProps.showNotificationModal),
    })
)(MessagePaneView);
