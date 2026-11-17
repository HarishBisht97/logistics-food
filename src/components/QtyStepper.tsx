type Props = {
  qty: number;
  label: string;
  onChange: (qty: number) => void;
  disabled?: boolean;
};

export function QtyStepper({ qty, label, onChange, disabled }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || qty <= 0}
        onClick={() => onChange(qty - 1)}
        className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-xl leading-none disabled:opacity-40"
      >
        −
      </button>
      <span className="w-8 text-center font-mono text-sm font-medium">{qty}</span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled || qty >= 99}
        onClick={() => onChange(qty + 1)}
        className="grid h-11 w-11 place-items-center rounded-full bg-primary text-xl leading-none text-white disabled:bg-fill disabled:text-muted"
      >
        +
      </button>
    </div>
  );
}
