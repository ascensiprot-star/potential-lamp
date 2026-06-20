import { vi } from 'vitest'

export const useNavigate = vi.fn(() => vi.fn())
export const useLocation = vi.fn(() => ({ pathname: '/', search: '', hash: '', state: null }))
export const useParams = vi.fn(() => ({}))
export const Link = ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
export const NavLink = ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
export const Navigate = ({ to }) => null
export const Outlet = () => null
export const Routes = ({ children }) => <div>{children}</div>
export const Route = ({ children }) => <div>{children}</div>
export const BrowserRouter = ({ children }) => <div>{children}</div>
export const HashRouter = ({ children }) => <div>{children}</div>
export const MemoryRouter = ({ children }) => <div>{children}</div>