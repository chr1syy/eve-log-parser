import { cn } from "@/lib/utils";

type EveSsoButtonSize = "large" | "small";
type EveSsoButtonVariant = "white" | "black";

const BUTTONS: Record<
  EveSsoButtonVariant,
  Record<EveSsoButtonSize, string>
> = {
  white: {
    large:
      "https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-large.png",
    small:
      "https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-small.png",
  },
  black: {
    large:
      "https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-black-large.png",
    small:
      "https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-black-small.png",
  },
};

interface EveSsoButtonProps {
  size?: EveSsoButtonSize;
  variant?: EveSsoButtonVariant;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export default function EveSsoButton({
  size = "large",
  variant = "white",
  className,
  disabled,
  onClick,
}: EveSsoButtonProps) {
  const src = BUTTONS[variant][size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Log in with EVE Online"
      className={cn(
        "inline-flex items-center justify-center",
        "transition-opacity duration-150",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <img
        src={src}
        alt="Log in with EVE Online"
        className={cn(
          "block h-auto",
          size === "large" ? "max-w-full" : "max-w-[220px]",
        )}
      />
    </button>
  );
}
