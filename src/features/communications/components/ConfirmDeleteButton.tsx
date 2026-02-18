import { useState } from "react";

interface ConfirmDeleteButtonProps {
  onConfirm: () => void;
  itemName?: string;
  disabled?: boolean;
}

/**
 * Two-click delete button — replaces browser confirm() dialog.
 * First click shows "Are you sure?", second click performs the delete.
 * Auto-resets after 3 seconds if not confirmed.
 */
export function ConfirmDeleteButton({
  onConfirm,
  itemName = "this item",
  disabled,
}: ConfirmDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      onConfirm();
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={
        confirming
          ? "px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          : "px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
      }
    >
      {confirming ? `Delete ${itemName}?` : "Delete"}
    </button>
  );
}
