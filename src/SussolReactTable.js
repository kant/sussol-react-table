import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Cell, ColumnHeaderCell, EditableCell, Column, Table } from '@blueprintjs/table';
import FlatButton from 'material-ui/FlatButton';

const DEFAULT_SORT = 'asc';
const DEFAULT_COLUMN_ALIGN = 'left';

const styles = {
  cell: {
    textAlign: 'left',
  },
  getCellStyles: function cellStyles(align) { // eslint-disable-line object-shorthand
    const map = {
      left: 'left',
      center: 'center',
      right: 'right',
    };

    // return enum mapped value, else default if invalid enum
    return Object.assign(
      {},
      this.cell,
      { textAlign: map[align] ? map[align] : DEFAULT_COLUMN_ALIGN },
    );
  },
};

/**
* compare
*
* Provides a basic implementation of either a sort ASC or sort DESC comparator.
* Sort example: 10 will come after 2, not "1, 10, 2"
*
* @param {any}     data which can be converted to a string
* @param {any}     data which can be converted to a string
* @param {bool}    isAscending: true/false
* @return {int}    e.g. -1, 0, 1
*/
const compare = (a, b, isAscending) => (
  isAscending
    ? a.toString().localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    : b.toString().localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })
);

const renderSortIcon = direction => (
  direction === 'asc'
    ? <svg width="18" height="18" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z" /><path d="M0 0h24v24H0z" fill="none" /></svg>
    : <svg width="18" height="18" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z" /><path d="M0 0h24v24H0z" fill="none" /></svg>
);

/**
* sortColumn
*
* Provides sorted data: ASC or DESC given a column key and a comparator func.
*
* @param {str}      columnKey: column key string
* @param {func}     comparator: sort func
* @return {arr}     sorted array
*/
const sortColumn = (columnKey, comparator, tableData, isAscending) => (
  tableData.sort((a, b) => (
    comparator(
      a[columnKey],
      b[columnKey],
      isAscending,
    )
  ))
);

export class SussolReactTable extends PureComponent {
  constructor(props) {
    super(props);

    // initial state
    const { columns, defaultSortOrder, defaultSortKey } = props;

    const sortOrderToBool = defaultSortOrder === DEFAULT_SORT;
    const isAscending = sortOrderToBool;
    const tableData = defaultSortKey
      ? sortColumn(defaultSortKey, compare, props.tableData, isAscending)
      : props.tableData;

    this.state = {
      columns,
      isAscending,
      sortBy: defaultSortKey || '',
      tableData,
    };

    // bindings
    this.renderCell = this.renderCell.bind(this);
    this.renderColumnHeader = this.renderColumnHeader.bind(this);
    this.renderEditableCell = this.renderEditableCell.bind(this);
    this.toggleSortOrder = this.toggleSortOrder.bind(this);
    this.renderColumns = this.renderColumns.bind(this);
  }

  componentDidMount() {
    if (this.state.tableData.length === 0) this.generateLoadingRows();
  }

  componentWillReceiveProps({ tableData }) {
    this.setState({ tableData, dataLoading: !(tableData.length > 0) });
  }

  generateLoadingRows(rowCount = this.props.loadingRowCount) {
    if (rowCount === 0) return;
    const rows = [];
    const { columns } = this.state;
    for (let i = 0; i < rowCount; i += 1) {
      rows.push({});

      for (let j = 0; j < columns.length; j += 1) {
        rows[i][columns[j].key] = columns[j].key;
      }
    }

    this.setState({ tableData: rows, dataLoading: true });
  }

  toggleSortOrder(column) {
    if (!column.sortable) return;

    const { key } = column;
    const { isAscending, tableData } = this.state;
    const sortedTableData = sortColumn(key, compare, tableData, !isAscending);

    this.setState({
      sortBy: key,
      isAscending: !this.state.isAscending,
      tableData: sortedTableData,
    });
  }

  // Renders column headers. Gets the sort direction from state and the label columns array.
  renderColumnHeader(column) {
    let sortIcon;
    const { key, sortable } = column;
    const { isAscending, sortBy } = this.state;

    if (sortable && sortBy === key) {
      sortIcon = isAscending
        ? (renderSortIcon('asc'))
        : (renderSortIcon('desc'));
    }

    return (
      <ColumnHeaderCell>
        <FlatButton
          label={column.title}
          labelPosition="before"
          icon={sortIcon}
          onClick={() => this.toggleSortOrder(column)}
          style={{ width: '100%' }}
        />
      </ColumnHeaderCell>
    );
  }

  renderCell(rowIndex, columnIndex, { align, key }, { cellDataKey }) {
    const { dataLoading, tableData } = this.state;
    const value = tableData[rowIndex][key] !== null ? tableData[rowIndex][key] : '';
    const keyClassName = cellDataKey ? `${cellDataKey}-${tableData[rowIndex][cellDataKey]}` : '';
    const cellAlign = align || this.props.defaultColumnAlign;
    return (
      <Cell
        loading={dataLoading}
        className={keyClassName}
        style={styles.getCellStyles(cellAlign)}
      >
        {value}
      </Cell>
    );
  }

  renderEditableCell(rowIndex, columnIndex, columnKey, { cellDataKey }) {
    const { tableData } = this.state;
    const value = tableData[rowIndex][columnKey] !== null ? tableData[rowIndex][columnKey] : '';
    const keyClassName = cellDataKey ? `${cellDataKey}-${tableData[rowIndex][cellDataKey]}` : '';
    return (
      <EditableCell
        {...this.props.editableCellProps}
        // sorry to possibly thwart your propTypes,
        // but we need more than just the columnIndex, Blueprint!
        columnIndex={{ column: columnIndex, columnKey }}
        rowIndex={rowIndex}
        value={value}
        className={keyClassName}
      />
    );
  }

  renderColumns(props) {
    const { columns } = this.state;
    let key = 0;

    return columns.map((column) => {
      key += 1;
      return (
        <Column
          key={key}
          renderCell={(rowIndex, columnIndex) => (
            column.editable
              ? this.renderEditableCell(rowIndex, columnIndex, column.key, props)
              : this.renderCell(rowIndex, columnIndex, column, props)
          )}
          renderColumnHeader={() => this.renderColumnHeader(column)}
        />
      );
    });
  }

  render() {
    return (
      <Table {...this.props} numRows={(this.state.tableData.length)}>
        {this.renderColumns(this.props)}
      </Table>
    );
  }
}

SussolReactTable.propTypes = {
  ...Table.propTypes,
  columns: PropTypes.arrayOf(PropTypes.objectOf(PropTypes.any)).isRequired,
  tableData: PropTypes.arrayOf(PropTypes.objectOf(PropTypes.any)).isRequired,
  defaultSortKey: PropTypes.string,
  loadingRowCount: PropTypes.number,
  onEditableCellChange: PropTypes.func,
  rowHeight: PropTypes.number,
};

SussolReactTable.defaultProps = {
  columns: [],
  defaultColumnAlign: DEFAULT_COLUMN_ALIGN,
  defaultSortKey: '',
  defaultSortOrder: DEFAULT_SORT,
  loadingRowCount: 0,
  onEditableCellChange: () => {},
  rowHeight: 45,
};
