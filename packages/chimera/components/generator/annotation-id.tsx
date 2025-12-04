import React, { ReactElement } from "react";

type LabelWrapperProps = {
  label: string;
  children?: ReactElement<{ id?: string }> | null;
};

export function AnnotationIdWrapper({ label, children }: LabelWrapperProps) {
  // noop if no child
  if (!children) return null;

  // Only operate on real React elements
  if (!React.isValidElement(children)) {
    console.warn(
      "[LabelWrapper] Expected a single React element as child, got:",
      children
    );
    return null;
  }

  const existingId = (children.props as any).id;

  return React.cloneElement(children, {
    id: `label_${label}`,
    ...(existingId
      ? { "data-original-id": existingId }
      : null),
  });
}