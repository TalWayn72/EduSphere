import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';

describe('Table', () => {
  it('renders a table element', () => {
    render(<Table data-testid="table" />);
    expect(screen.getByTestId('table').tagName).toBe('TABLE');
  });

  it('forwards className', () => {
    render(<Table className="mt-4" data-testid="table" />);
    expect(screen.getByTestId('table')).toHaveClass('mt-4');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLTableElement>();
    render(<Table ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTableElement);
  });

  it('has correct displayName', () => {
    expect(Table.displayName).toBe('Table');
  });

  it('wraps in overflow container', () => {
    render(<Table data-testid="table" />);
    const wrapper = screen.getByTestId('table').parentElement;
    expect(wrapper).toHaveClass('overflow-auto');
  });
});

describe('TableHeader', () => {
  it('renders a thead element', () => {
    render(
      <table>
        <TableHeader data-testid="thead">
          <tr>
            <td>H</td>
          </tr>
        </TableHeader>
      </table>
    );
    expect(screen.getByTestId('thead').tagName).toBe('THEAD');
  });

  it('forwards className', () => {
    render(
      <table>
        <TableHeader className="bg-gray" data-testid="thead">
          <tr>
            <td>H</td>
          </tr>
        </TableHeader>
      </table>
    );
    expect(screen.getByTestId('thead')).toHaveClass('bg-gray');
  });

  it('has correct displayName', () => {
    expect(TableHeader.displayName).toBe('TableHeader');
  });
});

describe('TableBody', () => {
  it('renders a tbody element', () => {
    render(
      <table>
        <TableBody data-testid="tbody">
          <tr>
            <td>B</td>
          </tr>
        </TableBody>
      </table>
    );
    expect(screen.getByTestId('tbody').tagName).toBe('TBODY');
  });

  it('has correct displayName', () => {
    expect(TableBody.displayName).toBe('TableBody');
  });
});

describe('TableFooter', () => {
  it('renders a tfoot element', () => {
    render(
      <table>
        <TableFooter data-testid="tfoot">
          <tr>
            <td>F</td>
          </tr>
        </TableFooter>
      </table>
    );
    expect(screen.getByTestId('tfoot').tagName).toBe('TFOOT');
  });

  it('has correct displayName', () => {
    expect(TableFooter.displayName).toBe('TableFooter');
  });
});

describe('TableRow', () => {
  it('renders a tr element', () => {
    render(
      <table>
        <tbody>
          <TableRow data-testid="tr">
            <td>R</td>
          </TableRow>
        </tbody>
      </table>
    );
    expect(screen.getByTestId('tr').tagName).toBe('TR');
  });

  it('forwards className', () => {
    render(
      <table>
        <tbody>
          <TableRow className="bg-red" data-testid="tr">
            <td>R</td>
          </TableRow>
        </tbody>
      </table>
    );
    expect(screen.getByTestId('tr')).toHaveClass('bg-red');
  });

  it('has correct displayName', () => {
    expect(TableRow.displayName).toBe('TableRow');
  });
});

describe('TableHead', () => {
  it('renders a th element', () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead data-testid="th">Header</TableHead>
          </tr>
        </thead>
      </table>
    );
    expect(screen.getByTestId('th').tagName).toBe('TH');
  });

  it('has correct displayName', () => {
    expect(TableHead.displayName).toBe('TableHead');
  });
});

describe('TableCell', () => {
  it('renders a td element', () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell data-testid="td">Cell</TableCell>
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByTestId('td').tagName).toBe('TD');
  });

  it('forwards className', () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell className="px-8" data-testid="td">
              C
            </TableCell>
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByTestId('td')).toHaveClass('px-8');
  });

  it('has correct displayName', () => {
    expect(TableCell.displayName).toBe('TableCell');
  });
});

describe('TableCaption', () => {
  it('renders a caption element', () => {
    render(
      <table>
        <TableCaption data-testid="cap">Caption</TableCaption>
      </table>
    );
    expect(screen.getByTestId('cap').tagName).toBe('CAPTION');
  });

  it('has correct displayName', () => {
    expect(TableCaption.displayName).toBe('TableCaption');
  });
});
