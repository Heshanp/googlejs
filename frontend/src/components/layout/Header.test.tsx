
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';

// Mock next/navigation
const navigationMocks = vi.hoisted(() => ({
    push: vi.fn(),
    usePathname: vi.fn(),
    searchParams: {
        get: vi.fn(() => null),
    },
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: navigationMocks.push }),
    usePathname: () => navigationMocks.usePathname(),
    useSearchParams: () => navigationMocks.searchParams,
}));

// Mock hooks
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        isAuthenticated: false,
        user: null,
        logout: vi.fn(),
    }),
}));

vi.mock('../../store/useStore', () => ({
    useStore: () => ({
        searchQuery: '',
        isAuthModalOpen: false,
        authModalDefaultTab: 'login',
        authModalReturnUrl: null,
        closeAuthModal: vi.fn(),
        openAuthModal: vi.fn(),
    }),
}));

vi.mock('../../hooks/useNavigation', () => ({
    useNavigation: () => ({
        navigate: navigationMocks.push,
        navigateWithAuth: navigationMocks.push,
        searchParams: navigationMocks.searchParams,
    }),
}));

vi.mock('../../hooks/useMessages', () => ({
    useUnreadCount: () => 0,
}));

vi.mock('../../hooks/useNotifications', () => ({
    useNotifications: () => ({ unreadCount: 0 }),
}));

vi.mock('../../hooks/useScrollDirection', () => ({
    useScrollDirection: () => ({ scrollDirection: 'up', isScrolled: false }),
}));

vi.mock('../../services/locations.service', () => ({
    LocationsService: {
        getMajorCities: vi.fn().mockResolvedValue([
            { name: 'Auckland', region: 'Auckland', population: 1_400_000 },
            { name: 'Wellington', region: 'Wellington City', population: 200_000 },
            { name: 'Christchurch', region: 'Christchurch City', population: 380_000 },
        ]),
    },
}));

describe('Header', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        navigationMocks.searchParams.get.mockReturnValue(null);
    });

    it('renders correctly', () => {
        navigationMocks.usePathname.mockReturnValue('/some-page');
        render(<Header />);
        expect(screen.getByText(/justsell/i)).toBeDefined();
    });

    it('hides search input on landing page', () => {
        navigationMocks.usePathname.mockReturnValue('/');
        render(<Header />);
        const searchInput = screen.getByPlaceholderText(/Try 'vintage leather jacket'/i);
        expect(searchInput.parentElement?.className).toContain('pointer-events-none');
    });

    it('shows search input on other pages', () => {
        navigationMocks.usePathname.mockReturnValue('/search');
        render(<Header />);
        const searchInput = screen.getByPlaceholderText(/Try 'vintage leather jacket'/i);
        expect(searchInput).toBeDefined();
    });

    it('navigates to search page on enter', () => {
        navigationMocks.usePathname.mockReturnValue('/other');
        render(<Header />);

        const searchInput = screen.getByPlaceholderText(/Try 'vintage leather jacket'/i);
        fireEvent.change(searchInput, { target: { value: 'laptop' } });
        fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

        expect(navigationMocks.push).toHaveBeenCalledWith('/search?q=laptop&original=laptop');
    });

    it('parses natural language location queries before navigation', () => {
        navigationMocks.usePathname.mockReturnValue('/other');
        render(<Header />);

        const searchInput = screen.getByPlaceholderText(/Try 'vintage leather jacket'/i);
        fireEvent.change(searchInput, { target: { value: 'find me a coffee machine in Auckland' } });
        fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

        expect(navigationMocks.push).toHaveBeenCalledWith(expect.stringContaining('/search?q=coffee+machine'));
        expect(navigationMocks.push).toHaveBeenCalledWith(expect.stringContaining('location=Auckland'));
    });

    it('uses selected header location when query has no explicit location', async () => {
        navigationMocks.usePathname.mockReturnValue('/other');
        render(<Header />);

        fireEvent.click(screen.getByRole('button', { name: /all nz|,\s*nz/i }));
        fireEvent.click(await screen.findByRole('button', { name: /wellington/i }));

        const searchInput = screen.getByPlaceholderText(/Try 'vintage leather jacket'/i);
        fireEvent.change(searchInput, { target: { value: 'laptop' } });
        fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

        expect(navigationMocks.push).toHaveBeenCalledWith(expect.stringContaining('location=Wellington'));
    });

    it('prefers explicit query location over selected header location', async () => {
        navigationMocks.usePathname.mockReturnValue('/other');
        render(<Header />);

        fireEvent.click(screen.getByRole('button', { name: /all nz|,\s*nz/i }));
        fireEvent.click(await screen.findByRole('button', { name: /wellington/i }));

        const searchInput = screen.getByPlaceholderText(/Try 'vintage leather jacket'/i);
        fireEvent.change(searchInput, { target: { value: 'coffee machine in Auckland' } });
        fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

        expect(navigationMocks.push).toHaveBeenCalledWith(expect.stringContaining('location=Auckland'));
    });
});
