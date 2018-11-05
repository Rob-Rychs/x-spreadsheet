/*
  el: element in document
  row: {
    len: number,
    height: number
  }
  col: {
    len: number,
    width: number
  }
  style: {
    bgcolor: '#ffffff',
    align: 'left',
    valign: 'middle',
    wrapText: false,
    textDecoration: 'normal',
    color: '#333333',
    bi: border-index
    bti: border-index
    bri: border-index
    bbi: border-index
    bli: border-index
    font: {
      name: 'Arial',
      size: 14,
      bold: false,
      italic: false,
    },
  }
  border: [width, style, color]
*/
import alphabet from '../alphabet';
import helper from '../helper';
import _cell from '../cell';
import { Draw, DrawBox } from '../canvas/draw';
// gobal var
const leftFixedCellWidth = 60;
const cellPaddingWidth = 5;

class Table {
  constructor(el, row, col, style, formulam) {
    this.el = el;
    this.context = el.getContext('2d');
    this.draw = new Draw(el);
    this.row = row;
    this.col = col;
    this.formulam = formulam;
    this.rowm = {}; // {rowIndex: {height: 200},....}
    this.colm = {}; // {colIndex: {width: 200},....}
    this.scrollOffset = { x: 0, y: 0 };
    this.cellmm = {}; // {rowIndex: {colIndex: Cell}}
    this.style = style;
    this.styles = []; // style array
    this.borders = []; // border array
  }

  render() {
    this.clear();
    this.renderContentGrid();
    this.renderFixedHeaders();
    // set text style
    this.renderContent();
  }

  // x-scroll, y-scroll
  // offset = {x: , y: }
  scroll(offset) {
    Object.assign(this.scrollOffset, offset);
  }

  setData(data) {
    if (data) {
      const {
        rowm, colm, cellmm, styles, borders,
      } = data;
      if (rowm) this.rowm = rowm;
      if (colm) this.colm = colm;
      if (cellmm) this.cellmm = cellmm;
      if (styles) this.styles = styles;
      if (borders) this.borders = borders;
    }
  }

  clear() {
    this.draw.clear();
  }

  renderContent() {
    const { cellmm } = this;
    Object.keys(cellmm).forEach((rindex) => {
      Object.keys(cellmm[rindex]).forEach((cindex) => {
        this.renderCell(rindex, cindex, cellmm[rindex][rindex]);
      });
    });
  }

  renderCell(rindex, cindex, cell) {
    const {
      styles, formulam, cellmm, draw, row, scrollOffset,
    } = this;
    const style = styles[cell.si];
    const dbox = this.getDrawBox(rindex, cindex);

    // render cell style
    const {
      bgcolor, bi, bti, bri, bbi, bli,
    } = style;
    dbox.bgcolor = bgcolor;
    dbox.setBorders(
      this.borders[bi],
      this.borders[bti],
      this.borders[bri],
      this.borders[bbi],
      this.borders[bli],
    );
    draw.save()
      .translate(leftFixedCellWidth, row.height)
      .translate(scrollOffset.x, scrollOffset.y);
    draw.rect(dbox);
    // render text
    const cellText = _cell.render(cell.text, formulam, (x, y) => (cellmm[x] && cellmm[x][y] && cellmm[x][y].text) || '');
    const wrapText = (style && style.wrapText) || this.style.wrapText;
    const font = Object.assign({}, this.style.font, style.font);
    draw.text(cellText, dbox, {
      align: (style && style.align) || this.style.align,
      valign: (style && style.align) || this.style.valign,
      font,
      color: (style && style.color) || this.style.color,
    }, wrapText);
    draw.restore();
  }

  getCellRectWithIndexes(x, y) {
    // console.log('x: ', x, ', y: ', y);
    // 根据鼠标坐标点，获得所在的cell矩形信息(ri, ci, offsetX, offsetY, width, height)
    const { row, col, scrollOffset } = this;
    let tHeight = 0 + row.height + scrollOffset.y;
    let i = 0;
    let j = 0;
    let cellWidth = leftFixedCellWidth;
    let cellHeight = row.height;
    for (; i < row.len; i += 1) {
      if (tHeight > y) break;
      cellHeight = this.getRowHeight(i);
      tHeight += cellHeight;
    }
    let tWidth = 0 + leftFixedCellWidth + scrollOffset.x;
    for (; j < col.len; j += 1) {
      if (tWidth > x) break;
      cellWidth = this.getColWidth(j);
      tWidth += cellWidth;
    }
    const left = tWidth - cellWidth - scrollOffset.x;
    const top = tHeight - cellHeight - scrollOffset.y;
    // console.log('left: ', left, ', top: ', top, ', tWidth: ', tWidth, ', tHeight: ', tHeight);
    return {
      ri: i,
      ci: j,
      left,
      top,
      width: cellWidth,
      height: cellHeight,
    };
  }

  getDrawBox(rindex, cindex) {
    let x; let y; let width; let height;
    this.rowEach(rindex, (i, y1, rowHeight) => {
      y = y1;
      height = rowHeight;
    });
    this.colEach(cindex, (i, x1, colWidth) => {
      x = x1;
      width = colWidth;
    });
    return new DrawBox(x, y, width, height, cellPaddingWidth);
  }

  renderContentGrid() {
    const {
      draw, scrollOffset, row, col,
    } = this;
    draw.save();
    draw.attr({
      lineWidth: 0.5,
      strokeStyle: '#d0d0d0',
    });
    draw.translate(leftFixedCellWidth, row.height);
    draw.translate(scrollOffset.x, scrollOffset.y);
    // sum
    const colSumWidth = this.colTotalWidth();
    const rowSumHeight = this.rowTotalHeight();
    this.rowEach(row.len, (i, y) => {
      draw.line([0, y], [colSumWidth, y]);
    });
    this.colEach(col.len, (i, x) => {
      draw.line([x, 0], [x, rowSumHeight]);
    });
    draw.restore();
  }

  renderFixedHeaders() {
    const {
      draw, row, col, scrollOffset,
    } = this;
    draw.save();
    // draw rect background
    draw.attr({ fillStyle: '#f4f5f8' })
      .fillRect(0, 0, leftFixedCellWidth, this.rowTotalHeight() + row.height)
      .fillRect(0, 0, this.colTotalWidth() + leftFixedCellWidth, row.height);
    // draw text
    // text font, align...
    draw.attr({
      textAlign: 'center',
      textBaseline: 'middle',
      font: '500 12px sans-serif',
      fillStyle: '#585757',
      lineWidth: 0.5,
      strokeStyle: '#d0d0d0',
    });
    // draw.beginPath();
    this.rowEach(row.len, (i, y1, rowHeight) => {
      const y = y1 + row.height + scrollOffset.y;
      const [tx, ty] = [0 + (leftFixedCellWidth / 2), y + (rowHeight / 2)];
      if (i !== row.len) draw.fillText(i + 1, tx, ty);
      draw.line([0, y], [leftFixedCellWidth, y]);
    });
    draw.line([leftFixedCellWidth, 0], [leftFixedCellWidth, this.rowTotalHeight() + row.height]);
    // x-header-text
    this.colEach(col.len, (i, x1, colWidth) => {
      // console.log('::::::', i, x1, colWidth, alphabet.stringAt(i));
      const x = x1 + leftFixedCellWidth + scrollOffset.x;
      const [tx, ty] = [x + (colWidth / 2), 0 + (row.height / 2)];
      if (i !== col.len) draw.fillText(alphabet.stringAt(i), tx, ty);
      draw.line([x, 0], [x, row.height]);
    });
    draw.line([0, row.height], [this.colTotalWidth() + leftFixedCellWidth, row.height]);
    // left-top-cell
    draw.attr({ fillStyle: '#f4f5f8' })
      .fillRect(0, 0, leftFixedCellWidth, row.height);
    // context.closePath();
    draw.restore();
  }

  colTotalWidth() {
    const { col, colm } = this;
    const [cmTotal, cmSize] = helper.sum(colm, v => v.width || 0);
    return ((col.len - cmSize) * col.width) + cmTotal;
  }

  rowTotalHeight() {
    const { row, rowm } = this;
    const [rmTotal, rmSize] = helper.sum(rowm, v => v.height || 0);
    return ((row.len - rmSize) * row.height) + rmTotal;
  }

  colEach(colLen, cb) {
    let x = 0;
    for (let i = 0; i <= colLen; i += 1) {
      const colWidth = this.getColWidth(i);
      cb(i, x, colWidth);
      x += colWidth;
    }
  }

  getColWidth(index) {
    const { col, colm } = this;
    return colm[`${index}`] ? colm[`${index}`].width : col.width;
  }

  setColWidth(index, v) {
    this.colm[`${index}`] = this.colm[`${index}`] || {};
    this.colm[`${index}`].width = v;
    this.render();
  }

  rowEach(rowLen, cb) {
    let y = 0;
    for (let i = 0; i <= rowLen; i += 1) {
      const rowHeight = this.getRowHeight(i);
      cb(i, y, rowHeight);
      y += rowHeight;
    }
  }

  getRowHeight(index) {
    const { row, rowm } = this;
    return rowm[`${index}`] ? rowm[`${index}`].height : row.height;
  }

  setRowHeight(index, v) {
    this.rowm[`${index}`] = this.rowm[`${index}`] || {};
    this.rowm[`${index}`].height = v;
    this.render();
  }
}

export default Table;