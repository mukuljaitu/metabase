import styled from "@emotion/styled";
import { css } from "@emotion/react";

import { color } from "metabase/lib/colors";

import SidebarLink from "./SidebarLink";

export const DragIconContainer = styled.div`
  left: 2px;
  opacity: 0;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  cursor: grab;
`;

// Notice that dragged item styles are defined in sortable.css file
// This is a limitation of react-sortable-hoc library
export const StyledSidebarLink = styled(SidebarLink)<{ isDragging: boolean }>`
  position: relative;

  &:hover {
    ${DragIconContainer} {
      opacity: 0.3;
    }
  }

  ${props =>
    props.isDragging &&
    css`
      &:hover {
        background: ${color("bg-white")};

        ${SidebarLink.Icon}, ${DragIconContainer} {
          color: ${color("brand-light")} !important;
        }

        ${SidebarLink.RightElement} {
          opacity: 0;
        }
      }
    `}
`;
