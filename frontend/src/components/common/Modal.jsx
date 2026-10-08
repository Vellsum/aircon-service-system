import React from "react";


// Generic modal shell. Pass any content as children.
// Usage: <Modal title="..." onClose={...}>...content...</Modal>
const Modal = ({ title, onClose, children }) => {
  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dash-modal-head">
          <h3>{title}</h3>
          <button className="dash-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
