import * as React from 'react';
import { connect } from 'react-redux'
import * as Modal from 'react-modal';
import { hideNotificationModal } from './Store';

export interface NotificationModalProps {
  isOpen: boolean;
  title: string,
  text: string,
  buttonText: string,
  onRequestClose(): ()=> any,
}

class NotificationModalComponent extends React.Component<NotificationModalProps, any> {
  render() {
    return (
      <Modal
        className={{
          base: 'notification-modal',
          afterOpen: 'notification-modal_after-open',
          beforeClose: 'notification-modal_before-close'
        }}
        ariaHideApp={false}
        onRequestClose={this.props.onRequestClose}
        isOpen={this.props.isOpen}>
        <header className="notification-modal-header"><h4>{this.props.title}</h4></header>
        <p className="notification-modal-text">{this.props.text}</p>
        <footer className="notification-modal-buttons">
          <button onClick={this.props.onRequestClose}>{this.props.buttonText}</button>
        </footer>
      </Modal>
    );
  }
}

export const NotificationModal = connect((state) => ({
  isOpen: state.history.isModalOpen,
  ...state.history.modalSettings,
}), {
  onRequestClose: hideNotificationModal,
})(NotificationModalComponent)