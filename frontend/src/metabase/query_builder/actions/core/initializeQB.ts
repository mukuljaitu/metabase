import _ from "underscore";
import querystring from "querystring";
import { LocationDescriptorObject } from "history";

import * as MetabaseAnalytics from "metabase/lib/analytics";
import { deserializeCardFromUrl, loadCard } from "metabase/lib/card";
import { normalize } from "metabase/lib/query/normalize";
import * as Urls from "metabase/lib/urls";

import { cardIsEquivalent } from "metabase/meta/Card";

import { setErrorPage } from "metabase/redux/app";
import { getMetadata } from "metabase/selectors/metadata";
import { getUser } from "metabase/selectors/user";

import Snippets from "metabase/entities/snippets";
import Questions from "metabase/entities/questions";
import { fetchAlertsForQuestion } from "metabase/alert/alert";

import {
  Dispatch,
  GetState,
  QueryBuilderUIControls,
} from "metabase-types/store";
import { Card, SavedCard } from "metabase-types/types/Card";
import Question from "metabase-lib/lib/Question";
import NativeQuery from "metabase-lib/lib/queries/NativeQuery";
import StructuredQuery from "metabase-lib/lib/queries/StructuredQuery";

import { getQueryBuilderModeFromLocation } from "../../typed-utils";
import { updateUrl } from "../navigation";
import { cancelQuery, runQuestionQuery } from "../querying";

import { resetQB } from "./core";
import { loadMetadataForCard } from "./metadata";
import {
  handleDashboardParameters,
  getParameterValuesForQuestion,
} from "./parameterUtils";

type BlankQueryOptions = {
  db?: string;
  table?: string;
  segment?: string;
  metric?: string;
};

type QueryParams = BlankQueryOptions & {
  slug?: string;
  objectId?: string;
};

type UIControls = Partial<QueryBuilderUIControls>;

const ARCHIVED_ERROR = {
  data: {
    error_code: "archived",
  },
  context: "query-builder",
};

const NOT_FOUND_ERROR = {
  data: {
    error_code: "not-found",
  },
  context: "query-builder",
};

function getCardForBlankQuestion({
  db,
  table,
  segment,
  metric,
}: BlankQueryOptions) {
  const databaseId = db ? parseInt(db) : undefined;
  const tableId = table ? parseInt(table) : undefined;

  let question = Question.create({ databaseId, tableId });

  if (databaseId && tableId) {
    if (segment) {
      question = (question.query() as StructuredQuery)
        .filter(["segment", parseInt(segment)])
        .question();
    }
    if (metric) {
      question = (question.query() as StructuredQuery)
        .aggregate(["metric", parseInt(metric)])
        .question();
    }
  }

  return question.card();
}

function deserializeCard(serializedCard: string) {
  const card = deserializeCardFromUrl(serializedCard);
  if (card.dataset_query.database != null) {
    // Ensure older MBQL is supported
    card.dataset_query = normalize(card.dataset_query);
  }
  return card;
}

async function fetchAndPrepareSavedQuestionCards(
  cardId: number,
  dispatch: Dispatch,
  getState: GetState,
) {
  const card = await loadCard(cardId, { dispatch, getState });
  const originalCard = { ...card };

  // for showing the "started from" lineage correctly when adding filters/breakouts and when going back and forth
  // in browser history, the original_card_id has to be set for the current card (simply the id of card itself for now)
  card.original_card_id = card.id;

  return { card, originalCard };
}

async function fetchAndPrepareAdHocQuestionCards(
  deserializedCard: Card,
  dispatch: Dispatch,
  getState: GetState,
) {
  if (!deserializedCard.original_card_id) {
    return {
      card: deserializedCard,
      originalCard: null,
    };
  }

  const originalCard = await loadCard(deserializedCard.original_card_id, {
    dispatch,
    getState,
  });

  if (cardIsEquivalent(deserializedCard, originalCard)) {
    return {
      card: { ...originalCard },
      originalCard: originalCard,
    };
  }

  return {
    card: deserializedCard,
    originalCard,
  };
}

type ResolveCardsResult = {
  card: Card;
  originalCard?: Card;
};

async function resolveCards({
  cardId,
  deserializedCard,
  options,
  dispatch,
  getState,
}: {
  cardId?: number;
  deserializedCard?: Card;
  options: BlankQueryOptions;
  dispatch: Dispatch;
  getState: GetState;
}): Promise<ResolveCardsResult> {
  if (!cardId && !deserializedCard) {
    return {
      card: getCardForBlankQuestion(options),
    };
  }
  return cardId
    ? fetchAndPrepareSavedQuestionCards(cardId, dispatch, getState)
    : fetchAndPrepareAdHocQuestionCards(
        deserializedCard as Card,
        dispatch,
        getState,
      );
}

function parseHash(hash?: string) {
  let options: BlankQueryOptions = {};
  let serializedCard;

  // hash can contain either query params starting with ? or a base64 serialized card
  if (hash) {
    const cleanHash = hash.replace(/^#/, "");
    if (cleanHash.charAt(0) === "?") {
      options = querystring.parse(cleanHash.substring(1));
    } else {
      serializedCard = cleanHash;
    }
  }

  return { options, serializedCard };
}

function isSavedCard(card: Card): card is SavedCard {
  return !!(card as SavedCard).id;
}

export const INITIALIZE_QB = "metabase/qb/INITIALIZE_QB";

async function handleQBInit(
  dispatch: Dispatch,
  getState: GetState,
  {
    location,
    params,
  }: { location: LocationDescriptorObject; params: QueryParams },
) {
  console.log("🚀", "Starting handleQBInit");
  dispatch(resetQB());
  dispatch(cancelQuery());

  const queryParams = location.query;
  const cardId = Urls.extractEntityId(params.slug);
  const uiControls: UIControls = getQueryBuilderModeFromLocation(location);
  console.log("🚀", { uiControls });
  const { options, serializedCard } = parseHash(location.hash);
  console.log("🚀", { location, serializedCard, options });
  const hasCard = cardId || serializedCard;
  console.log("🚀", { hasCard });

  const deserializedCard = serializedCard
    ? deserializeCard(serializedCard)
    : null;

  const { card, originalCard } = await resolveCards({
    cardId,
    deserializedCard,
    options,
    dispatch,
    getState,
  });

  if (isSavedCard(card) && card.archived) {
    dispatch(setErrorPage(ARCHIVED_ERROR));
    return;
  }

  if (
    isSavedCard(card) &&
    !card?.dataset &&
    location.pathname?.startsWith("/model")
  ) {
    dispatch(setErrorPage(NOT_FOUND_ERROR));
    return;
  }

  if (hasCard) {
    await handleDashboardParameters(card, {
      deserializedCard,
      originalCard,
      dispatch,
      getState,
    });
  } else {
    if (options.metric) {
      uiControls.isShowingSummarySidebar = true;
    }
  }

  MetabaseAnalytics.trackStructEvent(
    "QueryBuilder",
    hasCard ? "Query Loaded" : "Query Started",
    card.dataset_query.type,
  );

  if (isSavedCard(card)) {
    dispatch(fetchAlertsForQuestion(card.id));
  }

  console.log("🚀", "Before dispatching loadMetadataForCard in initializeQB");
  await dispatch(loadMetadataForCard(card));
  const metadata = getMetadata(getState());

  let question = new Question(card, metadata);
  if (question.isSaved()) {
    // Don't set viz automatically for saved questions
    question = question.lockDisplay();

    const currentUser = getUser(getState());
    if (currentUser.is_qbnewb) {
      uiControls.isShowingNewbModal = true;
      MetabaseAnalytics.trackStructEvent("QueryBuilder", "Show Newb Modal");
    }
  }

  if (question && question.isNative()) {
    const query = question.query() as NativeQuery;
    if (query.hasSnippets() && !query.readOnly()) {
      await dispatch(Snippets.actions.fetchList());
      const snippets = Snippets.selectors.getList(getState());
      question = question.setQuery(
        query.updateQueryTextWithNewSnippetNames(snippets),
      );
    }
  }

  const finalCard = question.card();

  const parameterValues = getParameterValuesForQuestion({
    card: finalCard,
    queryParams,
    metadata,
  });

  const objectId = params?.objectId || queryParams?.objectId;

  dispatch({
    type: INITIALIZE_QB,
    payload: {
      card: finalCard,
      originalCard,
      uiControls,
      parameterValues,
      objectId,
    },
  });

  if (uiControls.queryBuilderMode !== "notebook") {
    if (question.canRun()) {
      // Timeout to allow Parameters widget to set parameterValues
      console.log("🚀", "In question.canRun");
      setTimeout(
        () => dispatch(runQuestionQuery({ shouldUpdateUrl: false })),
        0,
      );
    }
    dispatch(
      updateUrl(finalCard, {
        replaceState: true,
        preserveParameters: hasCard,
        objectId,
      }),
    );
  }
}

export const initializeQB =
  (location: LocationDescriptorObject, params: QueryParams) =>
  async (dispatch: Dispatch, getState: GetState) => {
    try {
      await handleQBInit(dispatch, getState, { location, params });
    } catch (error) {
      console.warn("initializeQB failed because of an error:", error);
      dispatch(setErrorPage(error));
    }
  };
