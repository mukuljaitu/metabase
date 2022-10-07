import React from "react";

import Icon from "metabase/components/Icon";
import {
  ActionOptionListItem,
  ActionOptionTitle,
  ActionOptionDescription,
} from "./ActionOptionItem.styled";

interface ActionOptionProps {
  name: string;
  description?: string | null;
  isSelected: boolean;
  onClick: () => void;
}

export default function ActionOptionItem({
  name,
  description,
  isSelected,
  onClick,
}: ActionOptionProps) {
  return (
    <div className="text-brand cursor-pointer" onClick={onClick}>
      {name}
    </div>
  );
}
