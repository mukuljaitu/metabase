import _ from "underscore";

import type Table from "metabase-lib/lib/metadata/Table";

import type NativeQuery from "../NativeQuery";
import { getDatasetTable } from "./nested-card-query-table";

export function getNativeQueryTable(nativeQuery: NativeQuery): Table | null {
  const question = nativeQuery.question();
  const isDataset = question?.isDataset();

  if (isDataset) {
    return getDatasetTable(nativeQuery);
  }

  const database = nativeQuery.database();
  const collection = nativeQuery.collection();
  if (database && collection) {
    return (
      _.findWhere(database.tables, {
        name: collection,
      }) || null
    );
  }

  // Native queries aren't always associated with a specific table
  return null;
}
