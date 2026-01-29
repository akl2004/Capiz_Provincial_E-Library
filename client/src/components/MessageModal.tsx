import { useEffect } from "react";

interface MessageModalProps {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}

const MessageModal = ({ type, message, onClose }: MessageModalProps) => {
  const isSuccess = type === "success";

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-box animated-pop-in ${type}-border ${
          isSuccess ? "timer-active success-size" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* The connected path SVG */}
        {isSuccess && (
          <svg className="modal-timer-svg">
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              rx="10"
              className="timer-path"
              pathLength="1"
            />
          </svg>
        )}

        <div className="modal-content text-center">
          <div className="icon-wrapper-svg">
            {isSuccess ? (
              <svg
                className="checkmark animateElement"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 52 52"
              >
                <circle
                  className="checkmark__circle animateElement"
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                />
                <path
                  className="checkmark__check animateElement"
                  fill="none"
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                />
              </svg>
            ) : (
              <svg
                className="crossmark animateElement"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 52 52"
              >
                <circle
                  className="crossmark__circle animateElement"
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                />
                <path
                  className="cross__path cross__path--right animateElement"
                  fill="none"
                  d="M16,16 l20,20"
                />
                <path
                  className="cross__path cross__path--left animateElement"
                  fill="none"
                  d="M16,36 l20,-20"
                />
              </svg>
            )}
          </div>

          <h2 className={isSuccess ? "text-success" : "text-danger"}>
            {isSuccess ? "Success!" : "Action Failed"}
          </h2>

          <p className="modal-message text-dark">
            {message || "No error details provided."}
          </p>

          {/* Button only shows for Error state */}
          {!isSuccess && (
            <button onClick={onClose} className="modal-btn btn-danger">
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
