import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Layout from "./Layout";

// Mock child components to isolate the Layout component during tests.
jest.mock("./BottomNav", () => () => <div data-testid="bottom-nav-mock" />);
jest.mock("./CurrencySwitcher", () => ({
  CurrencySwitcher: () => <div data-testid="currency-switcher-mock" />,
}));

// Mock the Outlet component from react-router-dom to avoid rendering child routes.
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Outlet: () => <div data-testid="outlet-mock" />,
}));

describe("Layout Component", () => {
  const mockUser = {
    displayName: "Jane Doe",
    email: "jane.doe@example.com",
  };
  const mockOnLogout = jest.fn();

  // A helper function to render the component with necessary wrappers
  const renderLayout = () => {
    return render(
      <BrowserRouter>
        <Layout user={mockUser} onLogout={mockOnLogout} />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    // Clear mocks, localStorage, and reset the DOM before each test
    mockOnLogout.mockClear();
    localStorage.clear();
    document.documentElement.className = "";
    // Mock matchMedia for theme detection logic
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  test("renders the layout with user information and navigation", () => {
    renderLayout();

    // Check for company branding
    expect(screen.getByText("MyCompany")).toBeInTheDocument();

    // Check for user name and initials
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument(); // Initials for "Jane Doe"

    // Check that main navigation links are present
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();

    // Check that mocked child components are rendered
    expect(screen.getByTestId("outlet-mock")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav-mock")).toBeInTheDocument();
    expect(screen.getByTestId("currency-switcher-mock")).toBeInTheDocument();
  });

  test("calls onLogout when the logout button is clicked", () => {
    renderLayout();

    // There are two logout buttons (desktop and mobile), we can find them by role
    const logoutButtons = screen.getAllByRole("button", { name: /logout/i });
    fireEvent.click(logoutButtons[0]);

    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });

  test("toggles dark mode when the theme switcher is clicked", () => {
    renderLayout();

    const themeToggleButton = screen.getByRole("button", {
      name: /switch to dark theme/i,
    });

    // Initially, dark mode should be off
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");

    // Click to enable dark mode
    fireEvent.click(themeToggleButton);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(themeToggleButton).toHaveAccessibleName(/switch to light theme/i);

    // Click to disable dark mode
    fireEvent.click(themeToggleButton);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  test("opens and closes the sidebar on mobile view", () => {
    renderLayout();

    const openMenuButton = screen.getByRole("button", {
      name: /open navigation/i,
    });
    const sidebar = screen.getByRole("complementary"); // <aside>

    // Sidebar should be hidden initially on mobile
    expect(sidebar).toHaveClass("-translate-x-full");

    // Open sidebar
    fireEvent.click(openMenuButton);
    expect(sidebar).toHaveClass("translate-x-0");
    expect(openMenuButton).toHaveAccessibleName(/close navigation/i);

    // Close sidebar by clicking the close button
    fireEvent.click(openMenuButton);
    expect(sidebar).toHaveClass("-translate-x-full");
  });

  test("closes the sidebar when a navigation link is clicked", () => {
    renderLayout();
    const openMenuButton = screen.getByRole("button", { name: /open navigation/i });
    const sidebar = screen.getByRole("complementary");
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });

    // Open the sidebar first
    fireEvent.click(openMenuButton);
    expect(sidebar).toHaveClass("translate-x-0");

    // Click a nav link and assert the sidebar is closed
    fireEvent.click(dashboardLink);
    expect(sidebar).toHaveClass("-translate-x-full");
  });
});