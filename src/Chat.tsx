import * as React from 'react';
import { findDOMNode } from 'react-dom';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import { sleep } from "./helpers/sleep";

import { Activity, IBotConnection, User, DirectLine, DirectLineOptions, CardActionTypes, GeneralEventType } from '@botique/botframework-directlinejs';
import { createStore, ChatActions, sendMessage, sendEvent } from './Store';
import { Provider } from 'react-redux';
import { SpeechOptions } from './SpeechOptions';
import { Speech } from './SpeechModule';
import { ActivityOrID, FormatOptions } from './Types';
import * as konsole from './Konsole';
import { getTabIndex } from './getTabIndex';
import { NotificationModal } from './NotificationModal';

export interface ChatProps {
    user: User,
    bot: User,
    botConnection?: IBotConnection,
    directLine?: DirectLineOptions,
    speechOptions?: SpeechOptions,
    locale?: string,
    selectedActivity?: BehaviorSubject<ActivityOrID>,
    sendTyping?: boolean,
    formatOptions?: FormatOptions,
    newConversationAutoMessage?: string,
    referral?: {
        eventName: string,
        value: any,
    },
    resize?: 'none' | 'window' | 'detect';
    userMessagesStyle?: {
      backgroundColor: string;
      color: string;
    }
}

import { History } from './History';
import { MessagePane } from './MessagePane';
import { Shell, ShellFunctions } from './Shell';

export class Chat extends React.Component<ChatProps, {}> {

    private store = createStore();

    private botConnection: IBotConnection;

    private generalEventsSubscription: Subscription | any;
    private activitySubscription: Subscription | any;
    private connectionStatusSubscription: Subscription | any;
    private selectedActivitySubscription: Subscription | any;
    private shellRef: React.Component & ShellFunctions;

    private didInitialLoad = false;

    private chatviewPanel: HTMLElement;
    private resizeListener = () => this.setSize();

    private _saveShellRef = this.saveShellRef.bind(this);

    constructor(props: ChatProps) {
        super(props);

        konsole.log("BotChat.Chat props", props);

        this.store.dispatch<ChatActions>({
            type: 'Set_Locale',
            locale: props.locale || (window.navigator as any)["userLanguage"] || window.navigator.language || 'en'
        });

        if (props.formatOptions)
            this.store.dispatch<ChatActions>({ type: 'Set_Format_Options', options: props.formatOptions });

        if (props.sendTyping)
            this.store.dispatch<ChatActions>({ type: 'Set_Send_Typing', sendTyping: props.sendTyping });

        if (props.speechOptions) {
            Speech.SpeechRecognizer.setSpeechRecognizer(props.speechOptions.speechRecognizer);
            Speech.SpeechSynthesizer.setSpeechSynthesizer(props.speechOptions.speechSynthesizer);
        }
    }

    public sendEvent(eventName: string, value: any){
        this.store.dispatch(sendEvent(eventName, value, this.props.user));
    }

    private handleIncomingActivity(activity: Activity) {
        let state = this.store.getState();
        switch (activity.type) {
            case "message":
                this.store.dispatch<ChatActions>({ type: activity.from.id === state.connection.user.id ? 'Receive_Sent_Message' : 'Receive_Message', activity });
                break;

            case "typing":
                if (activity.from.id !== state.connection.user.id)
                    this.store.dispatch<ChatActions>({ type: 'Show_Typing', activity });
                break;
        }
    }

    private setSize() {
        this.store.dispatch<ChatActions>({
            type: 'Set_Size',
            width: this.chatviewPanel.offsetWidth,
            height: this.chatviewPanel.offsetHeight
        });
    }

    private saveShellRef(shellWrapper: any) {
        this.shellRef = shellWrapper ? shellWrapper.getWrappedInstance() : null;
    }

    componentDidMount() {
        // Now that we're mounted, we know our dimensions. Put them in the store (this will force a re-render)
        this.setSize();

        const botConnection = this.props.directLine
            ? (this.botConnection = new DirectLine(this.props.directLine))
            : this.props.botConnection
            ;

        if (this.props.resize === 'window')
            window.addEventListener('resize', this.resizeListener);

        this.store.dispatch<ChatActions>({ type: 'Start_Connection', user: this.props.user, bot: this.props.bot, botConnection, selectedActivity: this.props.selectedActivity });

        this.connectionStatusSubscription = botConnection.connectionStatus$.subscribe(connectionStatus =>{
                if(this.props.speechOptions && this.props.speechOptions.speechRecognizer){
                    let refGrammarId = botConnection.referenceGrammarId;
                    if(refGrammarId)
                        this.props.speechOptions.speechRecognizer.referenceGrammarId = refGrammarId;
                }
                this.store.dispatch<ChatActions>({ type: 'Connection_Change', connectionStatus })

                if(!this.didInitialLoad){
                    this.didInitialLoad = true;
                    this.store.dispatch<ChatActions>({ type: 'Get_History_Try', limit: 25 })
                }
            }
        );

        this.activitySubscription = botConnection.activity$.subscribe(
            activity => this.handleIncomingActivity(activity),
            error => konsole.log("activity$ error", error)
        );

        if (this.props.selectedActivity) {
            this.selectedActivitySubscription = this.props.selectedActivity.subscribe(activityOrID => {
                this.store.dispatch<ChatActions>({
                    type: 'Select_Activity',
                    selectedActivity: activityOrID.activity || this.store.getState().history.activities.find((activity: Activity)  => activity.id === activityOrID.id)
                });
            });
        }

        this.generalEventsSubscription = botConnection.generalEvents$.subscribe(async event => {
            if(this.props.newConversationAutoMessage && event === GeneralEventType.InitConversationNew){
                this.store.dispatch(sendMessage(this.props.newConversationAutoMessage, this.props.user, this.props.locale));
                await sleep(1000) // TODO: This is super ugly but works until we can control message dispatch ordering
            }

            if(this.props.referral && (event === GeneralEventType.InitConversationNew || event === GeneralEventType.InitConversationExisting)){
                this.store.dispatch(sendEvent(this.props.referral.eventName, this.props.referral.value, this.props.user))
            }
        })
    }

    componentWillUnmount() {
        this.connectionStatusSubscription.unsubscribe();
        this.activitySubscription.unsubscribe();
        if (this.generalEventsSubscription)
            this.generalEventsSubscription.unsubscribe();
        if (this.selectedActivitySubscription)
            this.selectedActivitySubscription.unsubscribe();
        if (this.botConnection)
            this.botConnection.end();
        window.removeEventListener('resize', this.resizeListener);
    }

    focusShell(key?: string){
        if(this.shellRef){
            this.shellRef.focus(key);
        }
    }

    // At startup we do three render passes:
    // 1. To determine the dimensions of the chat panel (nothing needs to actually render here, so we don't)
    // 2. To determine the margins of any given carousel (we just render one mock activity so that we can measure it)
    // 3. (this is also the normal re-render case) To render without the mock activity

    render() {
        const state = this.store.getState();
        konsole.log("BotChat.Chat state", state);

        // only render real stuff after we know our dimensions
        let header: JSX.Element;
        if (state.format.options.showHeader) header =
            <div className="wc-header">
                <span>{ state.format.strings.title }</span>
            </div>;

        let resize: JSX.Element;
        if (this.props.resize === 'detect') resize =
            <ResizeDetector onresize={ this.resizeListener } />;

        return (
            <Provider store={ this.store }>
                <div
                    className="wc-chatview-panel"
                    ref={ div => this.chatviewPanel = div }
                    tabIndex={ 0 }
                >
                    { header }
                    <NotificationModal/>
                    <MessagePane onSuggestedActionClick={() => this.focusShell()} userMessagesStyle={this.props.userMessagesStyle}>
                        <History userMessagesStyle={this.props.userMessagesStyle} />
                    </MessagePane>
                    <Shell ref={ this._saveShellRef } />
                    { resize }
                </div>
            </Provider>
        );
    }
}

export interface IDoCardAction {
    (type: CardActionTypes, value: string | object): Promise<boolean>;
}

const handleGeoLocation = async (showNotificationModal: (title: string, text: string, buttonText: string) => void,) : Promise<Position> => {
    return new Promise<Position>((res, rej) => {
        if(!navigator.geolocation){
            showNotificationModal('Location services not supported', 'Location services are not supported by you browser', 'Cancel');
            res();
        } else {
            navigator.geolocation.getCurrentPosition(res, (err) => {
                switch(err.code){
                    case err.PERMISSION_DENIED:
                        showNotificationModal('Permission Required', 'Botique needs permission to access your location. Please update your browser settings.', "Cancel");
                        break;
                    default:
                        showNotificationModal('Location unavailable', 'Location information is currently unavailable, please try again later', "Cancel");
                        break;
                }
                res();
            })
        }
    })
}

export const doCardAction = (
    botConnection: IBotConnection,
    from: User,
    locale: string,
    sendMessage: (value: string, user: User, locale: string) => void,
    sendLocation: (user: User, position: Position, locale: string) => void,
    showNotificationModal: (title: string, text: string, buttonText: string) => void,
): IDoCardAction => async (
    type,
    actionValue
) => {

    const text = (typeof actionValue === 'string') ? actionValue as string : undefined;
    const value = (typeof actionValue === 'object')? actionValue as object : undefined;
    let actionSuccess = true;

    switch (type) {
        case "imBack":
            if (typeof text === 'string')
                sendMessage(text, from, locale);
            break;

        case "postBack":
            sendPostBack(botConnection, text, value, from, locale);
            break;

        case "location":
            const position = await handleGeoLocation(showNotificationModal)
            if(position){
                sendLocation(from, position, locale);
            } else {
                actionSuccess = false;
            }
            break;

        case "call":
        case "openUrl":
        case "playAudio":
        case "playVideo":
        case "showImage":
        case "downloadFile":
        case "signin":
            window.open(text);
            break;

        default:
            konsole.log("unknown button type", type);
        }
    return actionSuccess;
}

export const sendPostBack = (botConnection: IBotConnection, text: string, value: object, from: User, locale: string) => {
    botConnection.postActivity({
        type: "message",
        text,
        value,
        from,
        locale
    })
    .subscribe(id => {
        konsole.log("success sending postBack", id)
    }, error => {
        konsole.log("failed to send postBack", error);
    });
}

export const renderIfNonempty = (value: any, renderer: (value: any) => JSX.Element ) => {
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > 0))
        return renderer(value);
}

export const classList = (...args:(string | boolean)[]) => {
    return args.filter(Boolean).join(' ');
}

// note: container of this element must have CSS position of either absolute or relative
const ResizeDetector = (props: {
    onresize: () => void
}) =>
    // adapted to React from https://github.com/developit/simple-element-resize-detector
    <iframe
        style={ { position: 'absolute', left: '0', top: '-100%', width: '100%', height: '100%', margin: '1px 0 0', border: 'none', opacity: 0, visibility: 'hidden', pointerEvents: 'none' } }
        ref={ frame => {
            if (frame)
                frame.contentWindow.onresize = props.onresize;
        } }
    />;

// For auto-focus in some browsers, we synthetically insert keys into the chatbox.
// By default, we insert keys when:
// 1. evt.key.length === 1 (e.g. "1", "A", "=" keys), or
// 2. evt.key is one of the map keys below (e.g. "Add" will insert "+", "Decimal" will insert ".")
const INPUTTABLE_KEY: { [key: string]: string } = {
    Add: '+',      // Numpad add key
    Decimal: '.',  // Numpad decimal key
    Divide: '/',   // Numpad divide key
    Multiply: '*', // Numpad multiply key
    Subtract: '-'  // Numpad subtract key
};

function inputtableKey(key: string) {
    return key.length === 1 ? key : INPUTTABLE_KEY[key];
}
