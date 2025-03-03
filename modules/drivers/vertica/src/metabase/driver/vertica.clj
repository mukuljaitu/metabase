(ns metabase.driver.vertica
  (:require [clojure.java.jdbc :as jdbc]
            [clojure.set :as set]
            [clojure.tools.logging :as log]
            [honeysql.core :as hsql]
            [honeysql.format :as hformat]
            [metabase.driver :as driver]
            [metabase.driver.common :as driver.common]
            [metabase.driver.sql-jdbc.common :as sql-jdbc.common]
            [metabase.driver.sql-jdbc.connection :as sql-jdbc.conn]
            [metabase.driver.sql-jdbc.execute :as sql-jdbc.execute]
            [metabase.driver.sql-jdbc.execute.legacy-impl :as sql-jdbc.legacy]
            [metabase.driver.sql-jdbc.sync :as sql-jdbc.sync]
            [metabase.driver.sql.query-processor :as sql.qp]
            [metabase.driver.sql.query-processor.empty-string-is-null :as sql.qp.empty-string-is-null]
            [metabase.util.date-2 :as u.date]
            [metabase.util.honeysql-extensions :as hx]
            [metabase.util.i18n :refer [trs]])
  (:import [java.sql ResultSet Types]))

(driver/register! :vertica, :parent #{:sql-jdbc
                                      ::sql-jdbc.legacy/use-legacy-classes-for-read-and-set
                                      ::sql.qp.empty-string-is-null/empty-string-is-null})

(defmethod driver/supports? [:vertica :percentile-aggregations] [_ _] false)

(defmethod driver/db-start-of-week :vertica
  [_]
  :monday)

(defmethod sql-jdbc.sync/database-type->base-type :vertica
  [_ database-type]
  ({:Boolean                   :type/Boolean
    :Integer                   :type/Integer
    :Bigint                    :type/BigInteger
    :Varbinary                 :type/*
    :Binary                    :type/*
    :Char                      :type/Text
    :Varchar                   :type/Text
    :Money                     :type/Decimal
    :Numeric                   :type/Decimal
    :Double                    :type/Decimal
    :Float                     :type/Float
    :Date                      :type/Date
    :Time                      :type/Time
    :TimeTz                    :type/TimeWithLocalTZ
    :Timestamp                 :type/DateTime
    :TimestampTz               :type/DateTimeWithLocalTZ
    :AUTO_INCREMENT            :type/Integer
    (keyword "Long Varchar")   :type/Text
    (keyword "Long Varbinary") :type/*} database-type))

(defmethod sql-jdbc.conn/connection-details->spec :vertica
  [_ {:keys [host port db dbname]
      :or   {host "localhost", port 5433, db ""}
      :as   details}]
  (-> (merge {:classname   "com.vertica.jdbc.Driver"
              :subprotocol "vertica"
              :subname     (str "//" host ":" port "/" (or dbname db))}
             (dissoc details :host :port :dbname :db :ssl))
      (sql-jdbc.common/handle-additional-options details)))

(defmethod sql.qp/unix-timestamp->honeysql [:vertica :seconds]
  [_ _ expr]
  (hsql/call :to_timestamp expr))

;; TODO - not sure if needed or not
(defn- cast-timestamp
  "Vertica requires stringified timestamps (what Date/DateTime/Timestamps are converted to) to be cast as timestamps
  before date operations can be performed. This function will add that cast if it is a timestamp, otherwise this is a
  no-op."
  [expr]
  (if (instance? java.time.temporal.Temporal expr)
    (hx/cast :timestamp expr)
    expr))

(defn- date-trunc [unit expr] (hsql/call :date_trunc (hx/literal unit) (cast-timestamp expr)))
(defn- extract    [unit expr] (hsql/call :extract    unit              expr))

(def ^:private extract-integer (comp hx/->integer extract))

(defmethod sql.qp/date [:vertica :default]         [_ _ expr] expr)
(defmethod sql.qp/date [:vertica :minute]          [_ _ expr] (date-trunc :minute expr))
(defmethod sql.qp/date [:vertica :minute-of-hour]  [_ _ expr] (extract-integer :minute expr))
(defmethod sql.qp/date [:vertica :hour]            [_ _ expr] (date-trunc :hour expr))
(defmethod sql.qp/date [:vertica :hour-of-day]     [_ _ expr] (extract-integer :hour expr))
(defmethod sql.qp/date [:vertica :day]             [_ _ expr] (hx/->date expr))
(defmethod sql.qp/date [:vertica :day-of-month]    [_ _ expr] (extract-integer :day expr))
(defmethod sql.qp/date [:vertica :day-of-year]     [_ _ expr] (extract-integer :doy expr))
(defmethod sql.qp/date [:vertica :month]           [_ _ expr] (date-trunc :month expr))
(defmethod sql.qp/date [:vertica :month-of-year]   [_ _ expr] (extract-integer :month expr))
(defmethod sql.qp/date [:vertica :quarter]         [_ _ expr] (date-trunc :quarter expr))
(defmethod sql.qp/date [:vertica :quarter-of-year] [_ _ expr] (extract-integer :quarter expr))
(defmethod sql.qp/date [:vertica :year]            [_ _ expr] (date-trunc :year expr))

(defmethod sql.qp/date [:vertica :week]
  [_ _ expr]
  (sql.qp/adjust-start-of-week :vertica (partial date-trunc :week) (cast-timestamp expr)))

(defmethod sql.qp/date [:vertica :day-of-week]
  [_ _ expr]
  (sql.qp/adjust-day-of-week :vertica (hsql/call :dayofweek_iso expr)))

(defmethod sql.qp/->honeysql [:vertica :concat]
  [driver [_ & args]]
  (->> args
       (map (partial sql.qp/->honeysql driver))
       (reduce (partial hsql/call :concat))))

(defmethod sql.qp/->honeysql [:vertica :regex-match-first]
  [driver [_ arg pattern]]
  (hsql/call :regexp_substr (sql.qp/->honeysql driver arg) (sql.qp/->honeysql driver pattern)))

(defmethod sql.qp/->honeysql [:vertica :percentile]
  [driver [_ arg p]]
  (hsql/raw (format "APPROXIMATE_PERCENTILE(%s USING PARAMETERS percentile=%s)"
                    (hformat/to-sql (sql.qp/->honeysql driver arg))
                    (hformat/to-sql (sql.qp/->honeysql driver p)))))

(defmethod sql.qp/->honeysql [:vertica :median]
  [driver [_ arg]]
  (hsql/call :approximate_median (sql.qp/->honeysql driver arg)))

(defmethod sql.qp/add-interval-honeysql-form :vertica
  [_ hsql-form amount unit]
  (hsql/call :timestampadd unit)
  ;; using `timestampadd` instead of `+ (INTERVAL)` because vertica add inteval for month, or year
  ;; by adding the equivalent number of days, not adding the unit compoinent.
  ;; For example `select date '2004-02-02' + interval '1 year' will return `2005-02-01` because it's adding
  ;; 365 days under the hood and 2004 is a leap year. Whereas other dbs will return `2006-02-02`.
  ;; So we use timestampadd to make the behavior consistent with other dbs
  (let [acceptable-types (case unit
                          (:millisecond :second :minute :hour) #{"time" "timetz" "timestamp" "timestamptz"}
                          (:day :week :month :quarter :year)   #{"date" "timestamp" "timestamptz"})
        hsql-form        (hx/cast-unless-type-in "timestamp" acceptable-types hsql-form)]
   (hsql/call :timestampadd unit amount hsql-form)))

(defn- materialized-views
  "Fetch the Materialized Views for a Vertica `database`.
   These are returned as a set of maps, the same format as `:tables` returned by `describe-database`."
  [database]
  (try (set (jdbc/query (sql-jdbc.conn/db->pooled-connection-spec database)
                        ["SELECT TABLE_SCHEMA AS \"schema\", TABLE_NAME AS \"name\" FROM V_CATALOG.VIEWS;"]))
       (catch Throwable e
         (log/error e (trs "Failed to fetch materialized views for this database")))))

(defmethod driver/describe-database :vertica
  [driver database]
  (-> ((get-method driver/describe-database :sql-jdbc) driver database)
      (update :tables set/union (materialized-views database))))

(defmethod driver.common/current-db-time-date-formatters :vertica
  [_]
  (driver.common/create-db-time-formatters "yyyy-MM-dd HH:mm:ss z"))

(defmethod driver.common/current-db-time-native-query :vertica
  [_]
  "select to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS TZ')")

(defmethod driver/current-db-time :vertica
  [& args]
  (apply driver.common/current-db-time args))

(defmethod sql-jdbc.execute/set-timezone-sql :vertica [_] "SET TIME ZONE TO %s;")

(defmethod sql-jdbc.execute/read-column [:vertica Types/TIME]
  [_ _ ^ResultSet rs _ ^Integer i]
  (when-let [s (.getString rs i)]
    (let [t (u.date/parse s)]
      (log/tracef "(.getString rs %d) [TIME] -> %s -> %s" i s t)
      t)))

(defmethod sql-jdbc.execute/read-column [:vertica Types/TIME_WITH_TIMEZONE]
  [_ _ ^ResultSet rs _ ^Integer i]
  (when-let [s (.getString rs i)]
    (let [t (u.date/parse s)]
      (log/tracef "(.getString rs %d) [TIME_WITH_TIMEZONE] -> %s -> %s" i s t)
      t)))
