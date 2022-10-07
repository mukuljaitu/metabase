import _ from "underscore";
import styled from "@emotion/styled";

import { color, lighten } from "metabase/lib/colors";
import { space } from "metabase/styled-components/theme";

import { SidebarItem } from "metabase/dashboard/components/ClickBehaviorSidebar/SidebarItem";

export const ActionSidebarItem = styled(SidebarItem.Selectable)<{
  hasDescription?: boolean;
}>`
  align-items: ${props => (props.hasDescription ? "flex-start" : "center")};
  margin-top: 2px;
`;

export const ActionSidebarItemIcon = styled(SidebarItem.Icon)<{
  isSelected?: boolean;
}>`
  .Icon {
    color: ${props =>
      props.isSelected ? color("text-white") : color("brand")};
  }
`;

export const ActionDescription = styled.span<{ isSelected?: boolean }>`
  width: 95%;
  margin-top: 2px;

  color: ${props =>
    props.isSelected ? color("text-white") : color("text-medium")};
`;

export const ClickMappingsContainer = styled.div`
  margin-top: 1rem;
`;

export const ModelActionList = styled.div`
  margin-bottom: ${space(2)};
  &:not(:last-child) {
    border-bottom: 1px solid ${color("border")};
  }
`;

export const ModelTitle = styled.h4`
  color: ${color("text-dark")};
  margin-bottom: ${space(2)};
  display: flex;
  align-items: center;
`;

export const ActionItem = styled.li`
  padding-left: ${space(3)};
  margin-bottom: ${space(2)};
  color: ${color("brand")};
  cursor: pointer;
  font-weight: bold;
  &:hover: {
    color: ${lighten("brand", 0.1)};
  }
`;
