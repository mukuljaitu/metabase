/* eslint-disable react/prop-types */
import React from "react";
import { connect } from "react-redux";

import { loadMetadataForCard } from "metabase/query_builder/actions";
import { getMetadata } from "metabase/selectors/metadata";

import Questions from "metabase/entities/questions";
import Question from "metabase-lib/lib/Question";

// type annotations

/*
 * SavedQuestionLaoder
 *
 * Load a saved quetsion and return it to the calling component
 *
 * @example
 *
 * Render prop style
 * import SavedQuestionLoader from 'metabase/containers/SavedQuestionLoader'
 *
 * // assuming
 * class ExampleSavedQuestionFeature extends React.Component {
 *    render () {
 *      return (
 *        <SavedQuestionLoader questionId={this.props.params.questionId}>
 *        { ({ question, loading, error }) => {
 *
 *        }}
 *        </SavedQuestion>
 *      )
 *    }
 * }
 *
 * @example
 *
 * The raw un-connected component is also exported so we can unit test it
 * without the redux store.
 */
export class SavedQuestionLoader extends React.Component {
  state = {
    // this will store the loaded question
    question: null,
    card: null,
    loading: false,
    error: null,
  };

  UNSAFE_componentWillMount() {
    // load the specified question when the component mounts
    this._loadQuestion(this.props.questionId);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    // if the questionId changes (this will most likely be the result of a
    // url change) then we need to load this new question
    if (nextProps.questionId !== this.props.questionId) {
      this._loadQuestion(nextProps.questionId);
    }

    // if the metadata changes for some reason we need to make sure we
    // update the question with that metadata
    if (nextProps.metadata !== this.props.metadata && this.state.card) {
      this.setState({
        question: new Question(this.state.card, nextProps.metadata),
      });
    }
  }

  /*
   * Load a saved question and any required metadata
   *
   * 1. Get the card from the api
   * 2. Load any required metadata into the redux store
   * 3. Create a new Question object to return to metabase-lib methods can
   *    be used
   * 4. Set the component state to the new Question
   */
  async _loadQuestion(questionId) {
    if (questionId == null) {
      this.setState({
        loading: false,
        error: null,
        question: null,
        card: null,
      });
      return;
    }
    try {
      this.setState({ loading: true, error: null });
      // get the saved question via the card API
      const card = await this.props.fetchQuestion(questionId);

      // pass the retrieved card to load any necessary metadata
      // (tables, source db, segments, etc) into
      // the redux store, the resulting metadata will be avaliable as metadata on the
      // component props once it's avaliable
      await this.props.loadMetadataForCard(card);

      // instantiate a new question object using the metadata and saved question
      // so we can use metabase-lib methods to retrieve information and modify
      // the question
      //
      const question = new Question(card, this.props.metadata);

      // finally, set state to store the Question object so it can be passed
      // to the component using the loader, keep a reference to the card
      // as well
      this.setState({ loading: false, question, card });
    } catch (error) {
      this.setState({ loading: false, error });
    }
  }

  render() {
    const { children } = this.props;
    const { question, loading, error } = this.state;
    // call the child function with our loaded question
    return children && children({ question, loading, error });
  }
}

// redux stuff
function mapStateToProps(state) {
  return {
    metadata: getMetadata(state),
  };
}

const mapDispatchToProps = dispatch => {
  return {
    loadMetadataForCard: card => dispatch(loadMetadataForCard(card)),
    fetchQuestion: async id => {
      const action = await dispatch(Questions.actions.fetch({ id }));
      return Questions.HACK_getObjectFromAction(action);
    },
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SavedQuestionLoader);
