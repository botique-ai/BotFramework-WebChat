export { App, AppProps } from './App';
export { Chat, ChatProps } from './Chat';
export { HistoryView } from './History';
export * from '@botique/botframework-directlinejs';
export { queryParams } from './Attachment';
export { SpeechOptions } from './SpeechOptions'
export { Speech } from './SpeechModule'
export { defaultStrings } from './Strings';
import { FormatOptions } from './Types';
// below are shims for compatibility with old browsers (IE 10 being the main culprit)
import 'core-js/modules/es6.string.starts-with';
import 'core-js/modules/es6.array.find';
import 'core-js/modules/es6.array.find-index';
