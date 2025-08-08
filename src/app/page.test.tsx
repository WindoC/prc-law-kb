import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HomePage from './page'
import { AuthProvider } from '@/contexts/AuthContext'

// Mock auth-client
jest.mock('@/lib/auth-client', () => ({
  isAuthenticated: jest.fn().mockResolvedValue(false),
  getUser: jest.fn().mockResolvedValue(null),
  logout: jest.fn().mockResolvedValue(undefined)
}))


// Mock AuthContext
const mockAuthContext = {
  user: null,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  refreshProfile: jest.fn(),
  isAuthenticated: false
}

/**
 * Test suite for HomePage component
 * Verifies that legal documents are properly integrated
 */
describe('HomePage Legal Documents Integration', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  const renderWithAuth = (component: React.ReactNode) => {
    return render(
      <AuthProvider>
        {component}
      </AuthProvider>
    )
  }

  it('renders the legal information section', async () => {
    renderWithAuth(<HomePage />)
    
    // Wait for component to load
    await screen.findByText('中國法律知識庫')
    
    // Check if legal information section is present
    expect(screen.getByText('法律資訊與條款')).toBeInTheDocument()
    expect(screen.getByText('請詳閱以下重要法律文件')).toBeInTheDocument()
  })

  it('renders all three legal document accordions', async () => {
    renderWithAuth(<HomePage />)
    
    // Wait for component to load
    await screen.findByText('中國法律知識庫')
    
    // Check for Terms of Use
    expect(screen.getByText('服務條款 (Terms of Use)')).toBeInTheDocument()
    expect(screen.getByText('最後更新：2025年6月7日')).toBeInTheDocument()
    
    // Check for Disclaimer
    expect(screen.getByText('免責聲明 (Disclaimer)')).toBeInTheDocument()
    expect(screen.getByText('重要法律聲明')).toBeInTheDocument()
    
    // Check for Privacy Policy
    expect(screen.getByText('數據收集聲明 (Privacy Policy)')).toBeInTheDocument()
    expect(screen.getByText('隱私保護政策')).toBeInTheDocument()
  })

  it('contains proper legal content structure', async () => {
    renderWithAuth(<HomePage />)
    
    // Wait for component to load
    await screen.findByText('中國法律知識庫')
    
    // Check for key legal content
    expect(screen.getByText(/歡迎使用「中國法律知識庫」/)).toBeInTheDocument()
    expect(screen.getByText(/僅供資訊參考之用/)).toBeInTheDocument()
    expect(screen.getByText(/我們收集的資訊/)).toBeInTheDocument()
  })

  it('has proper accessibility attributes for accordions', async () => {
    renderWithAuth(<HomePage />)
    
    // Wait for component to load
    await screen.findByText('中國法律知識庫')
    
    // Check for accordion structure
    const accordionButtons = screen.getAllByRole('button')
    const legalAccordionButtons = accordionButtons.filter(button => 
      button.textContent?.includes('服務條款') || 
      button.textContent?.includes('免責聲明') || 
      button.textContent?.includes('數據收集聲明')
    )
    
    expect(legalAccordionButtons).toHaveLength(3)
    
    // Check for proper ARIA attributes
    legalAccordionButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-expanded')
      expect(button).toHaveAttribute('aria-controls')
    })
  })

  it('displays proper icons for each legal document section', async () => {
    renderWithAuth(<HomePage />)
    
    // Wait for component to load
    await screen.findByText('中國法律知識庫')
    
    // Check for Font Awesome icons (they should be present in the DOM)
    const contractIcon = document.querySelector('.fa-file-contract')
    const warningIcon = document.querySelector('.fa-exclamation-triangle')
    const shieldIcon = document.querySelector('.fa-shield-alt')
    
    expect(contractIcon).toBeInTheDocument()
    expect(warningIcon).toBeInTheDocument()
    expect(shieldIcon).toBeInTheDocument()
  })
})