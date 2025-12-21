/**
 * Accessibility (a11y) smoke tests
 *
 * Uses axe-core to verify WCAG compliance.
 * Run with: npm run test:ci
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { configureAxe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Extend vitest matchers
expect.extend(toHaveNoViolations);

const axe = configureAxe({
  rules: {
    // Disable rules that may conflict with test environment
    region: { enabled: false },
  },
});

// Components to test
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Accessibility Tests', () => {
  describe('Button Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <Button>Click me</Button>
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('disabled button should have no violations', async () => {
      const { container } = render(
        <TestWrapper>
          <Button disabled>Disabled</Button>
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Input Component', () => {
    it('should have no accessibility violations with label', async () => {
      const { container } = render(
        <TestWrapper>
          <div>
            <label htmlFor="test-input">Name</label>
            <Input id="test-input" placeholder="Enter name" />
          </div>
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with aria-label', async () => {
      const { container } = render(
        <TestWrapper>
          <Input aria-label="Search" placeholder="Search..." />
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Card Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <Card>
            <h2>Card Title</h2>
            <p>Card content</p>
          </Card>
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Badge Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <Badge variant="success">Active</Badge>
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Combined Components (Form Pattern)', () => {
    it('form with inputs and buttons should have no violations', async () => {
      const { container } = render(
        <TestWrapper>
          <form aria-label="Search form">
            <div>
              <label htmlFor="search">Search</label>
              <Input id="search" type="search" placeholder="Search prospects..." />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

/**
 * NOTE: Drag-and-drop functionality is deferred.
 * When implemented, ensure keyboard alternatives:
 * - Arrow keys to move items
 * - Enter/Space to pick up/drop
 * - Escape to cancel
 * - Live region announcements for screen readers
 */
