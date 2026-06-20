import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'

describe('Avatar Component', () => {
  it('renders avatar with default styling', () => {
    render(<Avatar />)
    const avatar = document.querySelector('.relative.flex.h-10.w-10')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveClass('rounded-full', 'overflow-hidden')
  })

  it('renders avatar with image', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    
    const image = screen.getByAltText('User avatar')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('renders avatar with fallback when image fails', () => {
    render(
      <Avatar>
        <AvatarImage src="" alt="" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    )
    
    expect(screen.getByText('AB')).toBeInTheDocument()
  })

  it('applies custom className to avatar', () => {
    render(<Avatar className="custom-avatar" />)
    const avatar = document.querySelector('.custom-avatar')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveClass('custom-avatar')
  })

  it('applies custom className to avatar image', () => {
    render(
      <Avatar>
        <AvatarImage 
          src="https://example.com/avatar.jpg" 
          alt="Avatar" 
          className="custom-image"
        />
        <AvatarFallback>Fallback</AvatarFallback>
      </Avatar>
    )
    
    const image = screen.getByAltText('Avatar')
    expect(image).toHaveClass('custom-image')
  })

  it('applies custom className to avatar fallback', () => {
    render(
      <Avatar>
        <AvatarFallback className="custom-fallback">FB</AvatarFallback>
      </Avatar>
    )
    
    expect(screen.getByText('FB')).toHaveClass('custom-fallback')
  })

  it('renders avatar with correct base styles', () => {
    render(<Avatar />)
    const avatar = document.querySelector('.relative.flex')
    expect(avatar).toHaveClass(
      'h-10',
      'w-10',
      'shrink-0',
      'overflow-hidden',
      'rounded-full'
    )
  })

  it('renders avatar image with correct base styles', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="Test" />
        <AvatarFallback>Fallback</AvatarFallback>
      </Avatar>
    )
    
    const image = screen.getByAltText('Test')
    expect(image).toHaveClass('aspect-square', 'h-full', 'w-full')
  })

  it('renders avatar fallback with correct base styles', () => {
    render(
      <Avatar>
        <AvatarFallback>XY</AvatarFallback>
      </Avatar>
    )
    
    const fallback = screen.getByText('XY')
    expect(fallback).toHaveClass(
      'flex',
      'h-full',
      'w-full',
      'items-center',
      'justify-center',
      'rounded-full',
      'bg-muted'
    )
  })

  it('renders avatar with custom size via className', () => {
    render(<Avatar className="h-16 w-16" />)
    const avatar = document.querySelector('.h-16.w-16')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveClass('h-16', 'w-16')
  })

  it('renders avatar with initials fallback', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders avatar with single letter fallback', () => {
    render(
      <Avatar>
        <AvatarFallback>X</AvatarFallback>
      </Avatar>
    )
    
    expect(screen.getByText('X')).toBeInTheDocument()
  })

  it('renders avatar with emoji fallback', () => {
    render(
      <Avatar>
        <AvatarFallback>👤</AvatarFallback>
      </Avatar>
    )
    
    expect(screen.getByText('👤')).toBeInTheDocument()
  })

  it('handles missing alt text', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" />
        <AvatarFallback>Fallback</AvatarFallback>
      </Avatar>
    )
    
    const image = document.querySelector('img')
    expect(image).toBeInTheDocument()
  })

  it('renders avatar with data attributes', () => {
    render(<Avatar data-testid="test-avatar" />)
    expect(screen.getByTestId('test-avatar')).toBeInTheDocument()
  })

  it('renders avatar with border styling', () => {
    render(<Avatar className="border-2 border-primary" />)
    const avatar = document.querySelector('.border-2.border-primary')
    expect(avatar).toBeInTheDocument()
  })

  it('renders multiple avatars', () => {
    render(
      <div>
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>C</AvatarFallback>
        </Avatar>
      </div>
    )
    
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('renders avatar with complex fallback content', () => {
    render(
      <Avatar>
        <AvatarFallback>
          <div className="flex flex-col items-center">
            <span>👤</span>
            <span className="text-xs">User</span>
          </div>
        </AvatarFallback>
      </Avatar>
    )
    
    expect(screen.getByText('👤')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Avatar ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('renders avatar image with loading state', () => {
    render(
      <Avatar>
        <AvatarImage 
          src="https://example.com/avatar.jpg" 
          alt="Loading Avatar"
          loading="lazy"
        />
        <AvatarFallback>Loading...</AvatarFallback>
      </Avatar>
    )
    
    const image = screen.getByAltText('Loading Avatar')
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('renders avatar with object fit', () => {
    render(
      <Avatar>
        <AvatarImage 
          src="https://example.com/avatar.jpg" 
          alt="Object Fit Avatar"
          className="object-cover"
        />
        <AvatarFallback>Fallback</AvatarFallback>
      </Avatar>
    )
    
    const image = screen.getByAltText('Object Fit Avatar')
    expect(image).toHaveClass('object-cover')
  })
})