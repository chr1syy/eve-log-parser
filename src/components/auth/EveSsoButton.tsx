import { cn } from "@/lib/utils";
import Image from "next/image";

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

const BUTTON_DIMENSIONS: Record<
  EveSsoButtonSize,
  { width: number; height: number; className: string }
> = {
  large: { width: 360, height: 70, className: "max-w-full" },
  small: { width: 240, height: 46, className: "max-w-[220px]" },
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
  const { width, height, className: sizeClassName } = BUTTON_DIMENSIONS[size];

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
      <Image
        src={src}
        alt="Log in with EVE Online"
        width={width}
        height={height}
        sizes={size === "large" ? "(max-width: 768px) 100vw, 360px" : "220px"}
        className={cn(
          "block h-auto",
          sizeClassName,
        )}
      />
    </button>
  );
}
