import React, { useEffect, useState } from "react";

interface AlertProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({
  message,
  type = "info",
  duration = 5000,
  onClose,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  let bgColor = "#e6f7ff"; // info
  let textColor = "#1890ff";

  if (type === "success") {
    bgColor = "#e6ffed";
    textColor = "#2B8200";
  } else if (type === "error") {
    bgColor = "#FE8181";
    textColor = "#9D0404";
  }

  return (
    <div
      style={{
        backgroundColor: bgColor,
        color: textColor,
        padding: "10px 15px",
        borderRadius: "8px",
        marginBottom: "10px",
        textAlign: "center",
        fontWeight: 500,
        animation: "fadeIn 0.5s",
      }}
    >
      {message}
    </div>
  );
};

export default Alert;
