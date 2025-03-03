/* eslint "react/prop-types": "warn" */
import React from "react";
import PropTypes from "prop-types";
import { t } from "ttag";
import cx from "classnames";
import Card from "metabase/components/Card";

const DetailPane = ({ name, description, extra, values }) => (
  <div className="ml1">
    <p className={cx("text-spaced", { "text-medium": !description })}>
      {description || t`No description`}
    </p>
    {extra}
    {values && values.length > 0 && (
      <div>
        <h5 className="text-uppercase mt4 mb2">{t`Sample values`}</h5>
        <Card>
          <ul>
            {values.map((value, index) => (
              <li
                key={index}
                className={cx("p1 text-wrap", {
                  "border-bottom": index < values.length - 1,
                })}
              >
                {value[0]}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    )}
  </div>
);

DetailPane.propTypes = {
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  error: PropTypes.string,
  extra: PropTypes.element,
  values: PropTypes.array,
};

export default DetailPane;
