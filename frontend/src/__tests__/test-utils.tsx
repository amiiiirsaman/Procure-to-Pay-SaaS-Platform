import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';

interface WrapperOptions {
  route?: string;
  initialEntries?: string[];
}

/**
 * Render component wrapped with BrowserRouter for testing
 */
export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & WrapperOptions
) {
  const { route = '/', initialEntries, ...renderOptions } = options || {};

  if (initialEntries) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>,
      renderOptions
    );
  }

  window.history.pushState({}, 'Test page', route);
  
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>,
    renderOptions
  );
}

/**
 * Render component with route matching for testing views that use useParams
 */
export function renderWithRoute(
  ui: ReactElement,
  path: string,
  initialEntry: string,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={path} element={ui} />
      </Routes>
    </MemoryRouter>,
    options
  );
}

/**
 * Wait for loading to complete
 */
export async function waitForLoadingToFinish() {
  // Allow promises to resolve
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// Re-export everything from testing-library
export * from '@testing-library/react';
