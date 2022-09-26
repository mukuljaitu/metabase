import React from "react";
import _ from "underscore";
import { t } from "ttag";
import { connect } from "react-redux";

import Sidebar from "metabase/dashboard/components/Sidebar";
import ActionPicker from "metabase/containers/ActionPicker";

import { addActionToDashboard } from "metabase/dashboard/actions";

import type { ActionDisplayType, WritebackAction } from "metabase-types/api";
import type { State } from "metabase-types/store";

import { Heading, SidebarContent } from "./AddActionSidebar.styled";

const mapStateToProps = (state: State, props: any) => props;

const mapDispatchToProps = {
  addAction: addActionToDashboard,
};

function AddActionSidebarFn({
  dashId,
  addAction,
  displayType,
}: {
  dashId: number;
  addAction: ({
    dashId,
    action,
    displayType,
  }: {
    dashId: number;
    action: WritebackAction;
    displayType: ActionDisplayType;
  }) => void;
  displayType: ActionDisplayType;
}) {
  const handleActionSelected = async (action: WritebackAction) => {
    await addAction({ dashId, action, displayType });
  };

  return (
    <Sidebar>
      <SidebarContent>
        <Heading>
          {t`Add a ${
            displayType === "button" ? t`button` : t`form`
          } to the page`}
        </Heading>
        <ActionPicker onChange={handleActionSelected} />
      </SidebarContent>
    </Sidebar>
  );
}

export const AddActionSidebar = connect(
  mapStateToProps,
  mapDispatchToProps,
)(AddActionSidebarFn);
