import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

const src = 'https://example.test/photo.jpg';

describe('Avatar', () => {
  it('shows initials until the photo has loaded, then reveals it', () => {
    const { container } = render(<Avatar src={src} name="Ada Lovelace" />);
    expect(screen.getByRole('img', { name: 'Ada Lovelace avatar' })).toHaveTextContent('AL');
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', src);
    expect(img).toHaveClass('opacity-0');

    fireEvent.load(img);
    expect(img).toHaveClass('opacity-100');
  });

  it('keeps the initials when the photo fails to load', () => {
    const { container } = render(<Avatar src={src} name="Ada Lovelace" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Ada Lovelace avatar' })).toHaveTextContent('AL');
  });
});
