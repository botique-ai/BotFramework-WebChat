import * as React from 'react';
import { ChatState, FormatState } from './Store';
import { User } from '@botique/botframework-directlinejs';
import { classList } from './Chat';
import { Dispatch, connect } from 'react-redux';
import { Strings } from './Strings';
import { Speech } from './SpeechModule'
import { ChatActions, sendMessage, sendFiles } from './Store';
import { generateShellLineCountClass } from './helpers/generateShellLineCountClass';
import { isRTL } from './helpers/isRTL';

interface Props {
    inputText: string,
    strings: Strings,
    listening: boolean,
    lines: number;
    languageDirection: 'rtl' | 'ltr',

    onChangeText: (inputText: string, lines: number) => void

    sendMessage: (inputText: string) => void,
    sendFiles: (files: FileList) => void,
    stopListening: () => void,
    startListening: () => void
}

export interface ShellFunctions {
    focus: (appendKey?: string) => void
}

class ShellContainer extends React.Component<Props, {}> implements ShellFunctions {
    private textInput: HTMLTextAreaElement;
    private fileInput: HTMLInputElement;
    private widthMeasurer: HTMLSpanElement;

    constructor(props: Props) {
        super(props);
    }

    private measureLines(text: string){
        this.widthMeasurer.textContent = text;
        return (text.match(/\n/g) || []).length + Math.floor((this.widthMeasurer.scrollWidth) / this.textInput.scrollWidth) + 1;
    }

    private sendMessage() {
        if (this.props.inputText.trim().length > 0)
            this.props.sendMessage(this.props.inputText);
    }

    private onKeyPress(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey){
            this.textInput.focus();
            this.sendMessage();
            e.preventDefault();
        }
    }

    private onChangeText(val: string){
        this.widthMeasurer.textContent = val;
        this.props.onChangeText(val, this.measureLines(val));
    }

    private onClickSend() {
        if(this.isSendEnabled()){
            this.textInput.focus();
            this.sendMessage();
        }
    }

    private onChangeFile() {
        this.props.sendFiles(this.fileInput.files);
        this.fileInput.value = null;
    }

    private onTextInputFocus(){
        if(this.props.listening){
            this.props.stopListening();
        }
    }

    private onClickMic() {
        if(this.props.listening){
            this.props.stopListening();
        }
        else{
            this.props.startListening();
        }
    }

    private isSendEnabled(){
        return this.props.inputText.length > 0;
    }

    public focus(appendKey?: string) {
        this.textInput.focus();
        const text = this.props.inputText + appendKey;
        if (appendKey) {
            this.props.onChangeText(text, this.measureLines(text));
        }
    }

    render() {
        let className = 'wc-console';
        if (this.props.inputText.length > 0) className += ' has-text';
        if (isRTL(this.props.inputText)){
            className += ' rtl'
        }

        const showMicButton = this.props.listening || (Speech.SpeechRecognizer.speechIsAvailable()  && !this.props.inputText.length);
        const sendButtonClassName = classList(
            'wc-send',
            (showMicButton) && 'hidden',
            (this.isSendEnabled()) && 'enabled',
        );

        const micButtonClassName = classList(
            'wc-mic',
            !showMicButton && 'hidden',
            this.props.listening && 'active',
            !this.props.listening && 'inactive',
        );
        
        return (
            <div dir={this.props.languageDirection} className={`${className} ${generateShellLineCountClass(this.props.lines)}`}>
                <input id="wc-upload-input" type="file" ref={ input => this.fileInput = input } onChange={ () => this.onChangeFile() } />
                <div className="wc-textbox">
                    <span className="wc-measurer" ref={(span) => this.widthMeasurer = span} />
                    <textarea
                        wrap="soft"
                        className="wc-shellinput"
                        ref={ input => this.textInput = input }
                        autoFocus
                        value={ this.props.inputText }
                        onChange={ _ => this.onChangeText(this.textInput.value)}
                        onKeyPress={ e => this.onKeyPress(e) }
                        onFocus = {() => this.onTextInputFocus()}
                        placeholder={ this.props.listening ? this.props.strings.listeningIndicator : this.props.strings.consolePlaceholder }
                    />
                </div>
                <label className="wc-upload" htmlFor="wc-upload-input">
                    <div className="wc-upload-icon">
                    📎
                    </div>
                </label>
                <label className={sendButtonClassName} onClick={this.onClickSend.bind(this)} >
                    {this.props.strings.send}
                </label>

                <label className={micButtonClassName} onClick={ () => this.onClickMic() } >
                   <svg width="28" height="22" viewBox="0 0 58 58" >
                        <path d="M 44 28 C 43.448 28 43 28.447 43 29 L 43 35 C 43 42.72 36.72 49 29 49 C 21.28 49 15 42.72 15 35 L 15 29 C 15 28.447 14.552 28 14 28 C 13.448 28 13 28.447 13 29 L 13 35 C 13 43.485 19.644 50.429 28 50.949 L 28 56 L 23 56 C 22.448 56 22 56.447 22 57 C 22 57.553 22.448 58 23 58 L 35 58 C 35.552 58 36 57.553 36 57 C 36 56.447 35.552 56 35 56 L 30 56 L 30 50.949 C 38.356 50.429 45 43.484 45 35 L 45 29 C 45 28.447 44.552 28 44 28 Z"/>
                        <path id="micFilling" d="M 28.97 44.438 L 28.97 44.438 C 23.773 44.438 19.521 40.033 19.521 34.649 L 19.521 11.156 C 19.521 5.772 23.773 1.368 28.97 1.368 L 28.97 1.368 C 34.166 1.368 38.418 5.772 38.418 11.156 L 38.418 34.649 C 38.418 40.033 34.166 44.438 28.97 44.438 Z"/>
                        <path d="M 29 46 C 35.065 46 40 41.065 40 35 L 40 11 C 40 4.935 35.065 0 29 0 C 22.935 0 18 4.935 18 11 L 18 35 C 18 41.065 22.935 46 29 46 Z M 20 11 C 20 6.037 24.038 2 29 2 C 33.962 2 38 6.037 38 11 L 38 35 C 38 39.963 33.962 44 29 44 C 24.038 44 20 39.963 20 35 L 20 11 Z"/>
                    </svg>
                </label>
            </div>
        );
    }
}

export const Shell = connect(
    (state: ChatState) => ({
        // passed down to ShellContainer
        inputText: state.shell.input,
        lines: state.shell.lines,
        strings: state.format.strings,
        // only used to create helper functions below
        locale: state.format.locale,
        languageDirection: state.format.languageDirection,
        user: state.connection.user,
        listening : state.shell.listening
    }), {
        // passed down to ShellContainer
        onChangeText: (input: string, lines: number) => ({ type: 'Update_Input', input, lines, source: "text" } as ChatActions),
        stopListening:  () => ({ type: 'Listening_Stop' }),
        startListening:  () => ({ type: 'Listening_Starting' }),
        // only used to create helper functions below
        sendMessage,
        sendFiles
    }, (stateProps: any, dispatchProps: any, ownProps: any): Props => ({
        // from stateProps
        inputText: stateProps.inputText,
        lines: stateProps.lines,
        strings: stateProps.strings,
        listening : stateProps.listening,
        languageDirection: stateProps.languageDirection,
        // from dispatchProps
        onChangeText: dispatchProps.onChangeText,
        // helper functions
        sendMessage: (text: string) => dispatchProps.sendMessage(text, stateProps.user, stateProps.locale),
        sendFiles: (files: FileList) => dispatchProps.sendFiles(files, stateProps.user, stateProps.locale),
        startListening: () => dispatchProps.startListening(),
        stopListening: () => dispatchProps.stopListening()
    }), {
        withRef: true
    }
)(ShellContainer);
