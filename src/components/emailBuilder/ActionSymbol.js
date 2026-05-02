const ActionSymbol = ({ type }) => {
  const commonProps = {
    className: "h-4 w-4 shrink-0",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (type === "preview") {
    return (
      <svg {...commonProps}>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (type === "save") {
    return (
      <svg {...commonProps}>
        <path d="M5 3h12l2 2v16H5V3Z" />
        <path d="M8 3v6h8V3" />
        <path d="M8 21v-7h8v7" />
      </svg>
    );
  }

  if (type === "copy") {
    return (
      <svg {...commonProps}>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M5 16H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }

  if (type === "gmail") {
    return (
      <svg {...commonProps}>
        <path d="M4 6h16v12H4V6Z" />
        <path d="m4 7 8 6 8-6" />
        <path d="M4 18V9l8 6 8-6v9" />
      </svg>
    );
  }

  if (type === "outlook") {
    return (
      <svg {...commonProps}>
        <path d="M4 6h10v12H4V6Z" />
        <path d="M14 8h6v8h-6" />
        <path d="m14 9 6 3-6 3" />
        <path d="M8 10.5a2 2 0 1 1 0 3 2 2 0 0 1 0-3Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
};

export default ActionSymbol;
