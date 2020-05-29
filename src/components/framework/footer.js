import React from "react";
import { connect } from "react-redux";
import styled from 'styled-components';
import { withTranslation } from "react-i18next";
import { FaDownload } from "react-icons/fa";
import { dataFont, medGrey, materialButton } from "../../globalStyles";
import { TRIGGER_DOWNLOAD_MODAL } from "../../actions/types";
import Flex from "./flex";
import { applyFilter, updateVisibleTipsAndBranchThicknesses } from "../../actions/tree";
import { version } from "../../version";
import { publications } from "../download/downloadModal";
import { isValueValid } from "../../util/globals";
import hardCodedFooters from "./footer-descriptions";
import { parseMarkdown } from "../../util/parseMarkdown";
import DataGrid from 'react-data-grid';
import { Toolbar, Data, Filters } from "react-data-grid-addons";
import { getTraitFromNode } from "../../util/treeMiscHelpers";

const defaultColumnProperties = {
  filterable: true,
  width: 160
};

const selectors = Data.Selectors;
const {
  NumericFilter,
  AutoCompleteFilter,
  MultiSelectFilter,
  SingleSelectFilter
} = Filters;

const dot = (
  <span style={{marginLeft: 10, marginRight: 10}}>
    •
  </span>
);

const FooterStyles = styled.div`
  margin-left: 30px;
  padding-bottom: 30px;
  font-family: ${dataFont};
  font-size: 15px;
  font-weight: 300;
  color: rgb(136, 136, 136);
  line-height: 1.4;

  h1 {
    font-weight: 700;
    font-size: 2.2em;
    margin: 0.2em 0;
  }

  h2 {
    font-weight: 600;
    font-size: 2em;
    margin: 0.2em 0;
  }

  h3 {
    font-weight: 500;
    font-size: 1.8em;
    margin: 0.2em 0;
  }

  h4 {
    font-weight: 500;
    font-size: 1.6em;
    margin: 0.1em 0;
  }

  h5 {
    font-weight: 500;
    font-size: 1.4em;
    margin: 0.1em 0;
  }

  h6 {
    font-weight: 500;
    font-size: 1.2em;
    margin: 0.1em 0;
  }

  // Style for code block
  pre {
    padding: 16px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    background-color: #f6f8fa;
    border-radius: 3px;
  }

  // Code within code block
  pre code {
    padding: 0;
    margin: 0;
    overflow: visible;
    font-size: 100%;
    line-height: inherit;
    word-wrap: normal;
    background-color: initial;
    border: 0;
  }

  // Inline code
  p code {
    padding: .2em .4em;
    margin: 0;
    font-size: 85%;
    background-color: rgba(27,31,35,.05);
    border-radius: 3px;
  }

  .line {
    margin-top: 20px;
    margin-bottom: 20px;
    border-bottom: 1px solid #CCC;
  }

  .finePrint {
    font-size: 14px;
  }

  .acknowledgments {
    margin-top: 10px;
  }

  .filterList {
    margin-top: 10px;
    line-height: 1.0;
  }

  .imageContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
  }

  img {
    margin-left: 30px;
    margin-right: 30px;
    margin-top: 2px;
    margin-bottom: 2px;
  }

`;


export const getAcknowledgments = (metadata, dispatch) => {
  /**
   * If the metadata contains a description key, then it will take precendence the hard-coded
   * acknowledgements. Expects the text in the description to be in Mardown format.
   * Jover. December 2019.
  */
  if (metadata.description) {
    let cleanDescription;
    try {
      cleanDescription = parseMarkdown(metadata.description);
    } catch (error) {
      console.error(`Error parsing footer description: ${error}`);
      cleanDescription = '<p>There was an error parsing the footer description.</p>';
    }

    return (
      <div
        className='acknowledgments'
        dangerouslySetInnerHTML={{ __html: cleanDescription }} // eslint-disable-line react/no-danger
      />
    );
  }

  const preambleContent = "This work is made possible by the open sharing of genetic data by research groups from all over the world. We gratefully acknowledge their contributions.";
  const genericPreamble = (<div>{preambleContent}</div>);

  if (window.location.hostname === 'nextstrain.org') {
    return hardCodedFooters(dispatch, genericPreamble);
  }

  return (<div>{genericPreamble}</div>);

};

const dispatchFilter = (dispatch, activeFilters, key, value) => {
  const mode = activeFilters[key].indexOf(value) === -1 ? "add" : "remove";
  dispatch(applyFilter(mode, key, [value]));
};

export const displayFilterValueAsButton = (dispatch, activeFilters, filterName, itemName, display, showX) => {
  const active = activeFilters[filterName].indexOf(itemName) !== -1;
  if (active && showX) {
    return (
      <div key={itemName} style={{display: "inline-block"}}>
        <div
          className={'boxed-item-icon'}
          onClick={() => {dispatchFilter(dispatch, activeFilters, filterName, itemName);}}
          role="button"
          tabIndex={0}
        >
          {'\xD7'}
        </div>
        <div className={"boxed-item active-with-icon"}>
          {display}
        </div>
      </div>
    );
  }
  if (active) {
    return (
      <div
        className={"boxed-item active-clickable"}
        key={itemName}
        onClick={() => {dispatchFilter(dispatch, activeFilters, filterName, itemName);}}
        role="button"
        tabIndex={0}
      >
        {display}
      </div>
    );
  }
  return (
    <div
      className={"boxed-item inactive"}
      key={itemName}
      onClick={() => {dispatchFilter(dispatch, activeFilters, filterName, itemName);}}
      role="button"
      tabIndex={0}
    >
      {display}
    </div>
  );
};

const removeFiltersButton = (dispatch, filterNames, outerClassName, label) => {
  return (
    <div
      className={`${outerClassName} boxed-item active-clickable`}
      style={{paddingLeft: '5px', paddingRight: '5px', display: "inline-block"}}
      onClick={() => {
        filterNames.forEach((n) => dispatch(applyFilter("set", n, [])));
      }}
    >
      {label}
    </div>
  );
};

@connect((state) => {
  return {
    tree: state.tree,
    totalStateCounts: state.tree.totalStateCounts,
    metadata: state.metadata,
    colorOptions: state.metadata.colorOptions,
    browserDimensions: state.browserDimensions.browserDimensions,
    activeFilters: state.controls.filters,
    controls: state.controls
  };
})
class Footer extends React.Component {
  shouldComponentUpdate(nextProps) {
    if (this.props.tree.version !== nextProps.tree.version ||
    this.props.browserDimensions !== nextProps.browserDimensions) {
      return true;
    } else if (Object.keys(this.props.activeFilters) !== Object.keys(nextProps.activeFilters)) {
      return true;
    } else if (Object.keys(this.props.activeFilters)) {
      for (const name of this.props.activeFilters) {
        if (this.props.activeFilters[name] !== nextProps.activeFilters[name]) {
          return true;
        }
      }
    }
    return false;
  }

  displayFilter(filterName) {
    const { t } = this.props;
    const totalStateCount = this.props.totalStateCounts[filterName];
    const filterTitle = this.props.metadata.colorings[filterName] ? this.props.metadata.colorings[filterName].title : filterName;
    return (
      <div>
        {t("Filter by {{filterTitle}}", {filterTitle: filterTitle})}
        {this.props.activeFilters[filterName].length ? removeFiltersButton(this.props.dispatch, [filterName], "inlineRight", t("Clear {{filterName}} filter", { filterName: filterName})) : null}
        <div className='filterList'>
          <Flex wrap="wrap" justifyContent="flex-start" alignItems="center">
            {
              Array.from(totalStateCount.keys())
                .filter((itemName) => isValueValid(itemName)) // remove invalid values present across the tree
                .sort() // filters are sorted alphabetically
                .map((itemName) => {
                  const display = (
                    <span>
                      {`${itemName} (${totalStateCount.get(itemName)})`}
                    </span>
                  );
                  return displayFilterValueAsButton(this.props.dispatch, this.props.activeFilters, filterName, itemName, display, false);
                })
            }
          </Flex>
        </div>
      </div>
    );
  }
  getUpdated() {
    const { t } = this.props;
    if (this.props.metadata.updated) {
      return (<span>{t("Data updated")} {this.props.metadata.updated}</span>);
    }
    return null;
  }
  downloadDataButton() {
    const { t } = this.props;
    return (
      <button
        style={Object.assign({}, materialButton, {backgroundColor: "rgba(0,0,0,0)", color: medGrey, margin: 0, padding: 0})}
        onClick={() => { this.props.dispatch({ type: TRIGGER_DOWNLOAD_MODAL }); }}
      >
        <FaDownload />
        <span style={{position: "relative"}}>{" "+t("Download data")}</span>
      </button>
    );
  }
  getCitation() {
    return (
      <span>
        {"Nextstrain: "}
        <a href={publications.nextstrain.href} target="_blank" rel="noopener noreferrer">
          {publications.nextstrain.author}, <i>{publications.nextstrain.journal}</i>{` (${publications.nextstrain.year})`}
        </a>
      </span>
    );
  }

  constructor(props) {
    super(props);
    this.state = {filters: {}, sortColumn: null, sortDirection: null, datagrid: null};

  }
  componentDidMount() {
    if (this.state.datagrid)
      this.state.datagrid.onToggleFilter();
  }
  handleFilterChange(filter) {
    const newFilters = { ...this.state.filters };
    if (filter.filterTerm) {
      newFilters[filter.column.key] = filter;
    } else {
      delete newFilters[filter.column.key];
    }
    return newFilters;
  }

  getValidFilterValues(rows, columnId) {
    return rows
      .map(r => r[columnId])
      .filter((item, i, a) => {
        return i === a.indexOf(item);
      });
  }

  getRows(rows, filters) {
    const rows1 = selectors.getRows({ rows, filters });
    const selIds = rows1.map(v=>v.arrayIdx);
    if (this.props.controls.gridFiltered && this.props.controls.gridFiltered.length == selIds.length && this.props.controls.gridFiltered.sort().every(function(value, index) { return value === selIds.sort()[index]}))
    {}
    else {
      this.props.dispatch({type: 'GRID_FILTERED', data: selIds});
      this.props.dispatch(updateVisibleTipsAndBranchThicknesses());
    }
    
    if (this.state.sortColumn) {
      return this.sortRows(rows1, this.state.sortColumn, this.state.sortDirection);
    }
    return rows1;
  }
  sortRows(initialRows, sortColumn, sortDirection) {
    console.log(sortColumn);
    const comparer = (a, b) => {
      if (sortDirection === "ASC") {
        return a[sortColumn] > b[sortColumn] ? 1 : -1;
      } else if (sortDirection === "DESC") {
        return a[sortColumn] < b[sortColumn] ? 1 : -1;
      }
    };
    return sortDirection === "NONE" ? initialRows : [...initialRows].sort(comparer);
  }
  render() {
    if (!this.props.metadata || !this.props.tree.nodes) return null;
    const width = this.props.width - 30; // need to subtract margin when calculating div width   
    const dates = {
      dateMinNumeric: this.props.controls.dateMinNumeric,
      dateMaxNumeric: this.props.controls.dateMaxNumeric
    };
    var data = this.props.tree.nodes.filter(v=>
      {
        const nodeDate = getTraitFromNode(v, "num_date");
        return v.hasChildren==false && v.inView == true && nodeDate >= dates.dateMinNumeric && nodeDate <= dates.dateMaxNumeric;
      });
    console.log(data[0]);
    var columns1 = [
      {
        headerName: 'Idx',
        field: 'arrayIdx',
        key: 'arrayIdx',
        name: 'Idx',
        sortable: true,
        filterRenderer: NumericFilter,
        ...defaultColumnProperties

      },
      {
        key: 'name',
        name: 'Name',
        sortable: true,
        // filterRenderer: AutoCompleteFilter,
        ...defaultColumnProperties

      },
      {
        headerName: 'fullTipCount',
        field: 'fullTipCount',
        key: 'fullTipCount',
        name: 'fullTipCount',
        sortable: true,
        filter: true,
        ...defaultColumnProperties
      }, 
    ];
    Object.keys(this.props.activeFilters).map((name) => {
      columns1.push({
        headerName: this.props.metadata.colorings[name] ? this.props.metadata.colorings[name].title : name,
        field: 'node_attrs.' + name + '.value',
        name: this.props.metadata.colorings[name] ? this.props.metadata.colorings[name].title : name,
        key: 'node_attrs.' + name + '.value',
        sortable: true,
        filter: true,
        filterRenderer: AutoCompleteFilter,
        ...defaultColumnProperties
      });
    });

    data = data.map(v => {
      var val = {arrayIdx: v.arrayIdx, fullTipCount: v.fullTipCount, name: v.name };
      Object.keys(this.props.activeFilters).map((name) => {
        if (v.node_attrs[name] && v.node_attrs[name].value)
          val['node_attrs.' + name + '.value'] = v.node_attrs[name].value;
        else 
          val['node_attrs.' + name + '.value'] = '';
      });
      return val;
    });

    var filteredRows = this.getRows(data, this.state.filters);
    return (
      <FooterStyles>
        <div style={{width: width}}>
          <div className='line'/>
          {getAcknowledgments(this.props.metadata, this.props.dispatch)}
          <div className='line'/>
          <DataGrid
            ref={(datagrid)=>{this.state.datagrid = datagrid;}}
            columns={columns1}
            rowGetter={i => filteredRows[i]}
            rowsCount={filteredRows.length}
            minHeight={500}
            toolbar={<Toolbar enableFilter={true} />}
            onAddFilter={filter => this.setState({filters: this.handleFilterChange(filter)}) }
            onClearFilters={() => this.setState({filters: {}})}
            getValidFilterValues={columnKey => this.getValidFilterValues(data, columnKey)}
            onGridSort={(sortColumn, sortDirection) => {
              this.setState({sortColumn: sortColumn, sortDirection: sortDirection});
            }
            }
            minHeight={550} />          
          <Flex className='finePrint'>
            {this.getUpdated()}
            {dot}
            {this.downloadDataButton()}
            {dot}
            {"Auspice v" + version}
          </Flex>
          <div style={{height: "3px"}}/>
          <Flex className='finePrint'>
            {this.getCitation()}
          </Flex>
        </div>
      </FooterStyles>
    );
  }
}

// {dot}
//

const WithTranslation = withTranslation()(Footer);
export default WithTranslation;
