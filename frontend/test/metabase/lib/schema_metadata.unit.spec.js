import _ from "underscore";
import {
  foreignKeyCountsByOriginTable,
  isEqualsOperator,
  doesOperatorExist,
  getOperatorByTypeAndName,
  getFilterOperators,
  getSupportedAggregationOperators,
  getAggregationOperators,
  isFuzzyOperator,
  getSemanticTypeIcon,
  getSemanticTypeName,
} from "metabase/lib/schema_metadata";

import {
  TYPE,
  NUMBER,
  COORDINATE,
  PRIMARY_KEY,
  FOREIGN_KEY,
} from "metabase-lib/lib/types/constants";

describe("schema_metadata", () => {
  describe("foreignKeyCountsByOriginTable", () => {
    it("should work with null input", () => {
      expect(foreignKeyCountsByOriginTable(null)).toEqual(null);
    });

    it("should require an array as input", () => {
      expect(foreignKeyCountsByOriginTable({})).toEqual(null);
    });

    it("should count occurrences by origin.table.id", () => {
      expect(
        foreignKeyCountsByOriginTable([
          { origin: { table: { id: 123 } } },
          { origin: { table: { id: 123 } } },
          { origin: { table: { id: 123 } } },
          { origin: { table: { id: 456 } } },
        ]),
      ).toEqual({ 123: 3, 456: 1 });
    });
  });

  describe("doesOperatorExist", () => {
    it("should return a boolean indicating existence of operator with given name", () => {
      expect(doesOperatorExist("foo")).toBe(false);
      expect(doesOperatorExist("contains")).toBe(true);
      expect(doesOperatorExist("between")).toBe(true);
    });
  });

  describe("isEqualsOperator", () => {
    it("should evaluate whether it is an equals operator", () => {
      expect(isEqualsOperator()).toBe(false);
      expect(isEqualsOperator({ name: "foo" })).toBe(false);
      expect(isEqualsOperator({ name: "=" })).toBe(true);
    });
  });

  describe("getOperatorByTypeAndName", () => {
    it("should return undefined if operator does not exist", () => {
      expect(getOperatorByTypeAndName("FOO", "=")).toBe(undefined);
      expect(getOperatorByTypeAndName(NUMBER, "contains")).toBe(undefined);
    });

    it("should return a metadata object for specific operator type/name", () => {
      expect(getOperatorByTypeAndName(NUMBER, "between")).toEqual({
        name: "between",
        numFields: 2,
        validArgumentsFilters: [expect.any(Function), expect.any(Function)],
        verboseName: "Between",
      });
    });

    it("should have 'between' filter operator for the coordinate type", () => {
      expect(getOperatorByTypeAndName(COORDINATE, "between")).toEqual({
        name: "between",
        numFields: 2,
        validArgumentsFilters: [expect.any(Function), expect.any(Function)],
        verboseName: "Between",
      });
    });

    it("should return a metadata object for primary key", () => {
      expect(getOperatorByTypeAndName(PRIMARY_KEY, "=")).toEqual({
        multi: true,
        name: "=",
        numFields: 1,
        validArgumentsFilters: [expect.any(Function)],
        verboseName: "Is",
      });
    });

    it("should return a metadata object for foreign key", () => {
      expect(getOperatorByTypeAndName(FOREIGN_KEY, "between")).toEqual({
        name: "between",
        numFields: 2,
        validArgumentsFilters: [expect.any(Function), expect.any(Function)],
        verboseName: "Between",
      });
    });
  });

  describe("getFilterOperators", () => {
    it("should return proper filter operators for text/Integer primary key", () => {
      expect(
        getFilterOperators({
          effective_type: TYPE.Integer,
          semantic_type: TYPE.PK,
        }).map(op => op.name),
      ).toEqual([
        "=",
        "!=",
        ">",
        "<",
        "between",
        ">=",
        "<=",
        "is-null",
        "not-null",
      ]);
    });

    it("should return proper filter operators for type/Text primary key", () => {
      expect(
        getFilterOperators({
          effective_type: TYPE.Text,
          semantic_type: TYPE.PK,
        }).map(op => op.name),
      ).toEqual([
        "=",
        "!=",
        "contains",
        "does-not-contain",
        "is-null",
        "not-null",
        "is-empty",
        "not-empty",
        "starts-with",
        "ends-with",
      ]);
    });

    it("should return proper filter operators for type/TextLike foreign key", () => {
      expect(
        getFilterOperators({
          effective_type: TYPE.TextLike,
          semantic_type: TYPE.FK,
        }).map(op => op.name),
      ).toEqual(["=", "!=", "is-null", "not-null", "is-empty", "not-empty"]);
    });
  });

  describe("isFuzzyOperator", () => {
    it("should return false for operators that expect an exact match", () => {
      expect(isFuzzyOperator({ name: "=" })).toBe(false);
      expect(isFuzzyOperator({ name: "!=" })).toBe(false);
    });

    it("should return true for operators that are not exact", () => {
      expect(isFuzzyOperator({ name: "contains" })).toBe(true);
      expect(isFuzzyOperator({ name: "between" })).toBe(true);
    });
  });

  describe("getSemanticTypeIcon", () => {
    it("should return an icon associated with the given semantic type", () => {
      expect(getSemanticTypeIcon(TYPE.PK)).toEqual("label");
      expect(getSemanticTypeIcon(TYPE.Category)).toEqual("string");
      expect(getSemanticTypeIcon(TYPE.Price)).toEqual("int");
    });

    it("should return undefined if the semantic type does not exist", () => {
      expect(getSemanticTypeIcon(TYPE.Boolean)).toBeUndefined();
      expect(getSemanticTypeIcon("foo")).toBeUndefined();
    });

    it("should accept fallback argument for unknown types", () => {
      expect(getSemanticTypeIcon("foo", "ellipsis")).toBe("ellipsis");
    });
  });

  describe("getSemanticTypeName", () => {
    it("should return an name/label associated with the given semantic type", () => {
      expect(getSemanticTypeName(TYPE.PK)).toEqual("Entity Key");
      expect(getSemanticTypeName(TYPE.Category)).toEqual("Category");
      expect(getSemanticTypeName(TYPE.Price)).toEqual("Price");
    });

    it("should return undefined if the semantic type does not exist", () => {
      expect(getSemanticTypeName(TYPE.Boolean)).toBeUndefined();
      expect(getSemanticTypeName("foo")).toBeUndefined();
    });
  });

  describe("getSupportedAggregationOperators", () => {
    function getTable(features) {
      return {
        db: {
          features,
        },
      };
    }

    it("returns nothing without DB features", () => {
      const table = getTable([]);
      const operators = getSupportedAggregationOperators(table);
      expect(operators).toHaveLength(0);
    });

    it("returns correct basic aggregation operators", () => {
      const table = getTable(["basic-aggregations"]);
      const operators = getSupportedAggregationOperators(table);
      expect(operators.map(o => o.short)).toEqual([
        "rows",
        "count",
        "sum",
        "avg",
        "distinct",
        "cum-sum",
        "cum-count",
        "min",
        "max",
      ]);
    });

    it("filters out operators not supported by database", () => {
      const table = getTable(["standard-deviation-aggregations"]);
      const operators = getSupportedAggregationOperators(table);
      expect(operators).toEqual([
        expect.objectContaining({
          short: "stddev",
          requiredDriverFeature: "standard-deviation-aggregations",
        }),
      ]);
    });
  });

  describe("getAggregationOperators", () => {
    function setup({ fields = [] } = {}) {
      const table = {
        fields,
        db: {
          features: ["basic-aggregations", "standard-deviation-aggregations"],
        },
      };
      const fullOperators = getAggregationOperators(table);
      return {
        fullOperators,
        operators: fullOperators.map(operator => operator.short),
        operatorByName: _.indexBy(fullOperators, "short"),
      };
    }

    function getTypedFields(type) {
      return [
        { base_type: type },
        { effective_type: type },
        { semantic_type: type },
      ];
    }

    const PK = { semantic_type: TYPE.PK };
    const FK = { semantic_type: TYPE.FK };
    const ENTITY_NAME = { semantic_type: TYPE.Name };
    const ADDRESS = { semantic_type: TYPE.Address };
    const CATEGORY = { semantic_type: TYPE.Category };
    const NUMBERS = getTypedFields(TYPE.Number);
    const STRINGS = getTypedFields(TYPE.Text);
    const TEMPORALS = getTypedFields(TYPE.Temporal);

    describe("count", () => {
      it("offers without fields", () => {
        const { operators } = setup();
        expect(operators).toEqual(expect.arrayContaining(["count"]));
      });

      it("offers 'count' with fields", () => {
        const { operators } = setup({ fields: [PK, FK, STRINGS] });
        expect(operators).toEqual(expect.arrayContaining(["count"]));
      });
    });

    describe("distinct", () => {
      it("is not available without fields", () => {
        const { operators } = setup();
        expect(operators).toEqual(expect.not.arrayContaining(["distinct"]));
      });

      it("is available with any field", () => {
        const fields = [
          PK,
          FK,
          ADDRESS,
          CATEGORY,
          ...NUMBERS,
          ...STRINGS,
          ...TEMPORALS,
        ];
        const { operators, operatorByName } = setup({ fields });
        expect(operators).toEqual(expect.arrayContaining(["distinct"]));
        expect(operatorByName.distinct.fields[0]).toHaveLength(fields.length);
      });
    });

    describe("cumulative count", () => {
      it("is available without fields", () => {
        const { operators } = setup();
        expect(operators).toEqual(expect.arrayContaining(["cum-count"]));
      });

      it("is available with any field", () => {
        const { operators, operatorByName } = setup({
          fields: [
            PK,
            FK,
            ADDRESS,
            CATEGORY,
            ...NUMBERS,
            ...STRINGS,
            ...TEMPORALS,
          ],
        });
        expect(operators).toEqual(expect.arrayContaining(["cum-count"]));
        expect(operatorByName["cum-count"].fields).toHaveLength(0);
      });
    });

    describe("summable operators", () => {
      ["sum", "avg", "cum-sum", "stddev"].forEach(operator => {
        describe(operator, () => {
          it("is not available without fields", () => {
            const { operators } = setup();
            expect(operators).toEqual(expect.not.arrayContaining([operator]));
          });

          it("is not available without summable fields", () => {
            const { operators } = setup({
              fields: [PK, FK, ADDRESS, ...STRINGS, ...TEMPORALS],
            });
            expect(operators).toEqual(expect.not.arrayContaining([operator]));
          });

          ["base_type", "effective_type", "semantic_type"].forEach(type => {
            it(`is available with numeric field's ${type}`, () => {
              const field = { [type]: TYPE.Number };
              const { operators, operatorByName } = setup({ fields: [field] });
              expect(operators).toEqual(expect.arrayContaining([operator]));
              expect(operatorByName[operator].fields[0]).toEqual([field]);
            });
          });
        });
      });
    });

    describe("scoping operators", () => {
      ["min", "max"].forEach(operator => {
        describe(operator, () => {
          it("is not available without fields", () => {
            const { operators } = setup();
            expect(operators).toEqual(expect.not.arrayContaining([operator]));
          });

          it("is not available without scope fields", () => {
            const { operators } = setup({ fields: [ADDRESS] });
            expect(operators).toEqual(expect.not.arrayContaining([operator]));
          });

          ["base_type", "effective_type", "semantic_type"].forEach(type => {
            it(`is available with numeric field's ${type}`, () => {
              const field = { [type]: TYPE.Number };
              const { operators, operatorByName } = setup({ fields: [field] });
              expect(operators).toEqual(expect.arrayContaining([operator]));
              expect(operatorByName[operator].fields[0]).toEqual([field]);
            });

            it(`is available with temporal field's ${type}`, () => {
              const field = { [type]: TYPE.Temporal };
              const { operators, operatorByName } = setup({ fields: [field] });
              expect(operators).toEqual(expect.arrayContaining([operator]));
              expect(operatorByName[operator].fields[0]).toEqual([field]);
            });

            it(`is available with string field's ${type}`, () => {
              const field = { [type]: TYPE.Text };
              const { operators, operatorByName } = setup({ fields: [field] });
              expect(operators).toEqual(expect.arrayContaining([operator]));
              expect(operatorByName[operator].fields[0]).toEqual([field]);
            });
          });

          [
            { field: PK, name: "PK" },
            { field: FK, name: "FK" },
            { field: ENTITY_NAME, name: "entity name" },
            { field: CATEGORY, name: "category" },
            { field: { base_type: TYPE.Boolean }, name: "boolean (base type)" },
            {
              field: { effective_type: TYPE.Boolean },
              name: "boolean (effective type)",
            },
          ].forEach(testCase => {
            const { field, name } = testCase;

            it(`is available for ${name} fields`, () => {
              const { operators, operatorByName } = setup({ fields: [field] });
              expect(operators).toEqual(expect.arrayContaining([operator]));
              expect(operatorByName[operator].fields[0]).toEqual([field]);
            });
          });
        });
      });
    });
  });
});
