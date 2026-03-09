import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import { OAuthCallbackPage } from './OAuthCallbackPage';

describe('OAuthCallbackPage', () => {
  it('renders connecting message', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/oauth/google/callback?code=test123'] },
        React.createElement(
          Routes,
          {},
          React.createElement(Route, {
            path: '/oauth/google/callback',
            element: React.createElement(OAuthCallbackPage),
          })
        )
      )
    );
    expect(screen.getByText(/connecting google drive/i)).toBeDefined();
  });

  it('posts message to opener when code is present', () => {
    const postMessageMock = vi.fn();
    Object.defineProperty(window, 'opener', {
      value: { postMessage: postMessageMock },
      configurable: true,
    });

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/oauth/google/callback?code=auth-code-123'] },
        React.createElement(
          Routes,
          {},
          React.createElement(Route, {
            path: '/oauth/google/callback',
            element: React.createElement(OAuthCallbackPage),
          })
        )
      )
    );
    expect(postMessageMock).toHaveBeenCalledWith(
      { type: 'GOOGLE_OAUTH_CODE', code: 'auth-code-123' },
      expect.any(String)
    );
  });

  it('does not post when no code param', () => {
    const postMessageMock = vi.fn();
    Object.defineProperty(window, 'opener', {
      value: { postMessage: postMessageMock },
      configurable: true,
    });

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/oauth/google/callback'] },
        React.createElement(
          Routes,
          {},
          React.createElement(Route, {
            path: '/oauth/google/callback',
            element: React.createElement(OAuthCallbackPage),
          })
        )
      )
    );
    expect(postMessageMock).not.toHaveBeenCalled();
  });
});
