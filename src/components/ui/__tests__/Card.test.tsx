/**
 * Unit tests for Card components
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies default styling classes', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('shadow-sm');
  });

  it('accepts additional className', () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
  });

  it('passes through HTML attributes', () => {
    render(<Card id="test-id" data-custom="value">Content</Card>);
    const card = document.getElementById('test-id');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('data-custom', 'value');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header Content</CardHeader>);
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('applies default styling classes', () => {
    render(<CardHeader data-testid="header">Content</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('pb-4');
    expect(header).toHaveClass('mb-4');
    expect(header).toHaveClass('border-b');
  });

  it('accepts additional className', () => {
    render(<CardHeader className="custom-header" data-testid="header">Content</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('custom-header');
  });
});

describe('CardTitle', () => {
  it('renders as h3 element', () => {
    render(<CardTitle>Title Text</CardTitle>);
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Title Text');
  });

  it('applies default styling classes', () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    const title = screen.getByTestId('title');
    expect(title).toHaveClass('text-xl');
    expect(title).toHaveClass('font-semibold');
  });

  it('accepts additional className', () => {
    render(<CardTitle className="custom-title" data-testid="title">Title</CardTitle>);
    const title = screen.getByTestId('title');
    expect(title).toHaveClass('custom-title');
  });
});

describe('CardDescription', () => {
  it('renders as p element', () => {
    render(<CardDescription>Description text</CardDescription>);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('applies default styling classes', () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>);
    const desc = screen.getByTestId('desc');
    expect(desc).toHaveClass('text-sm');
  });

  it('accepts additional className', () => {
    render(<CardDescription className="custom-desc" data-testid="desc">Description</CardDescription>);
    const desc = screen.getByTestId('desc');
    expect(desc).toHaveClass('custom-desc');
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Main Content</CardContent>);
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('accepts additional className', () => {
    render(<CardContent className="custom-content" data-testid="content">Content</CardContent>);
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('custom-content');
  });

  it('passes through HTML attributes', () => {
    render(<CardContent id="content-id" data-custom="value">Content</CardContent>);
    const content = document.getElementById('content-id');
    expect(content).toBeInTheDocument();
    expect(content).toHaveAttribute('data-custom', 'value');
  });
});

describe('Card composition', () => {
  it('renders full card with all subcomponents', () => {
    render(
      <Card data-testid="full-card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description here</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main card content goes here</p>
        </CardContent>
      </Card>
    );

    expect(screen.getByTestId('full-card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Card Title' })).toBeInTheDocument();
    expect(screen.getByText('Card description here')).toBeInTheDocument();
    expect(screen.getByText('Main card content goes here')).toBeInTheDocument();
  });
});
