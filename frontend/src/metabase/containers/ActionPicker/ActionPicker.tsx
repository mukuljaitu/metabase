import React from "react";
import { t } from "ttag";
import _ from "underscore";

import EmptyState from "metabase/components/EmptyState";
import Icon from "metabase/components/Icon";

import Actions from "metabase/entities/actions";
import Questions from "metabase/entities/questions";

import type { Card, WritebackAction } from "metabase-types/api";
import type { State } from "metabase-types/store";

import { ModelTitle, ActionItem, ModelActionList } from "./ActionPicker.styled";

export default function ActionPicker({
  modelIds,
  onClick,
}: {
  modelIds: number[];
  onClick: (action: WritebackAction) => void;
}) {
  return (
    <div className="scroll-y">
      {modelIds.map(modelId => (
        <ConnectedModelActionPicker
          key={modelId}
          modelId={modelId}
          onClick={onClick}
        />
      ))}
    </div>
  );
}

function ModelActionPicker({
  onClick,
  model,
  actions,
}: {
  onClick: (newValue: WritebackAction) => void;
  model: Card;
  actions: WritebackAction[];
}) {
  if (!actions?.length) {
    return (
      <EmptyState
        message={t`There are no actions for this model`}
        action={t`Create new action`}
        link={"/action/create"}
      />
    );
  }

  return (
    <ModelActionList>
      <ModelTitle>
        <Icon name="model" size={16} className="mr2" />
        {model.name}
      </ModelTitle>
      <ul>
        {actions?.map(action => (
          <ActionItem onClick={() => onClick(action)} key={action.id}>
            {action.name ?? action.id}
          </ActionItem>
        ))}
      </ul>
    </ModelActionList>
  );
}

const ConnectedModelActionPicker = _.compose(
  Questions.load({
    id: (state: State, props: { modelId?: number | null }) => props?.modelId,
    entityAlias: "model",
  }),
  Actions.loadList({
    query: (state: State, props: { modelId?: number | null }) => ({
      "model-id": props?.modelId,
    }),
  }),
)(ModelActionPicker);
