/* eslint-disable react/prop-types */
import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { t } from "ttag";
import _ from "underscore";

import Link from "metabase/core/components/Link";
import { getMetadata } from "metabase/selectors/metadata";
import Tables from "metabase/entities/tables";
import GuiQueryEditor from "metabase/query_builder/components/GuiQueryEditor";
import * as Urls from "metabase/lib/urls";
import Question from "metabase-lib/lib/Question";
import Query from "metabase-lib/lib/queries/Query";

import withTableMetadataLoaded from "../hoc/withTableMetadataLoaded";

class PartialQueryBuilder extends Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    table: PropTypes.object.isRequired,
    updatePreviewSummary: PropTypes.func.isRequired,
    previewSummary: PropTypes.string,
  };

  componentDidMount() {
    const { value, table } = this.props;
    if (table && value != null) {
      this.props.updatePreviewSummary({
        type: "query",
        database: table.db_id,
        query: {
          ...value,
          "source-table": table.id,
        },
      });
    } else {
      this.maybeSetDefaultQuery();
    }
  }

  componentDidUpdate() {
    this.maybeSetDefaultQuery();
  }

  maybeSetDefaultQuery() {
    const { metadata, table, value } = this.props;
    if (value != null && !_.isEqual(Object.keys(value), ["source-table"])) {
      // only set the query if it doesn't already have an aggregation or filter
      return;
    }

    if (!metadata || !table) {
      // we need metadata and a table to generate a default question
      return;
    }

    const { id: tableId, db_id: databaseId } = table;
    const query = Question.create({ databaseId, tableId, metadata }).query();
    // const table = query.table();
    let queryWithFilters;
    if (table.entity_type === "entity/GoogleAnalyticsTable") {
      const dateField = table.fields.find(f => f.name === "ga:date");
      if (dateField) {
        queryWithFilters = query
          .filter(["time-interval", ["field", dateField.id, null], -365, "day"])
          .aggregate(["metric", "ga:users"]);
      }
    } else {
      queryWithFilters = query.aggregate(["count"]);
    }

    if (queryWithFilters) {
      this.setDatasetQuery(queryWithFilters.datasetQuery());
    }
  }

  setDatasetQuery = datasetQuery => {
    if (datasetQuery instanceof Query) {
      datasetQuery = datasetQuery.datasetQuery();
    }

    this.props.onChange(datasetQuery.query);
    this.props.updatePreviewSummary(datasetQuery);
  };

  render() {
    const { features, value, metadata, table, previewSummary } = this.props;

    const datasetQuery = table
      ? {
          type: "query",
          database: table.db_id,
          query: value,
        }
      : {
          type: "query",
          query: {},
        };

    const query = new Question(
      { dataset_query: datasetQuery },
      metadata,
    ).query();

    const previewCard = {
      dataset_query: datasetQuery,
    };
    const previewUrl = Urls.serializedQuestion(previewCard);

    return (
      <div className="py1">
        <GuiQueryEditor
          features={features}
          query={query}
          setDatasetQuery={this.setDatasetQuery}
          isShowingDataReference={false}
          supportMultipleAggregations={false}
          canChangeTable={this.props.canChangeTable}
        >
          <div className="flex align-center mx2 my2">
            <span className="text-bold px3">{previewSummary}</span>
            <Link
              to={previewUrl}
              data-metabase-event="Data Model;Preview Click"
              target={window.OSX ? null : "_blank"}
              rel="noopener noreferrer"
              className="Button Button--primary"
            >{t`Preview`}</Link>
          </div>
        </GuiQueryEditor>
      </div>
    );
  }
}

export default _.compose(
  Tables.load({
    id: (state, props) => props.value && props.value["source-table"],
    wrapped: true,
  }),
  withTableMetadataLoaded,
  connect((state, props) => ({ metadata: getMetadata(state) })),
)(PartialQueryBuilder);
