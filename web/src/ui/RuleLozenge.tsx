import "./RuleLozenge.css";

/** The red lozenge that marks a combat rule, wherever a rule is named. */
export function RuleLozenge({ className }: { readonly className?: string }) {
  return <span className={className === undefined ? "rule-lozenge" : `rule-lozenge ${className}`} aria-hidden="true" />;
}
