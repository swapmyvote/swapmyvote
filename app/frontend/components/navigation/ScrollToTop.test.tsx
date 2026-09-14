import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollToTop } from "@/components/navigation/ScrollToTop";

function renderRoutes() {
  return render(
    <MemoryRouter initialEntries={["/first"]}>
      <ScrollToTop />
      <Routes>
        <Route path="/first" element={<Link to="/second">go to second</Link>} />
        <Route path="/second" element={<p>second page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ScrollToTop", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("scrolls to the top when the route changes", async () => {
    renderRoutes();
    vi.mocked(window.scrollTo).mockClear();

    await userEvent.click(screen.getByRole("link", { name: "go to second" }));

    expect(screen.getByText("second page")).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("scrolls to the top on first render", () => {
    renderRoutes();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("renders nothing", () => {
    const { container } = render(
      <MemoryRouter>
        <ScrollToTop />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
