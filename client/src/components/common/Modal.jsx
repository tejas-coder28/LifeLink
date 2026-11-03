import React from 'react';
import GlassModal from './GlassModal';

/**
 * Modal adapter maintaining compatibility with GlassModal.
 */
const Modal = (props) => {
  return <GlassModal {...props} />;
};

export default Modal;
