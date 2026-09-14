import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollToTop } from "@/components/navigation/ScrollToTop";

function renderRoutes() {
  return render(
    <MemoryRouter initialEntries={["/first"]}>
      <ScrollToTop />
      <Routes>
        <Route
          path="/first"
          element={
            <>
              <Link to="/second">go to second</Link>
              <Link to="/third#middle">go to an anchor</Link>
            </>
          }
        />
        <Route path="/second" element={<p>second page</p>} />
        <Route path="/third" element={<p>third page</p>} />
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

  // The browser resolves the fragment itself. Scrolling to the top here would
  // undo that — which is the whole point of a /faq#legal link.
  it("leaves the scroll alone when the destination carries a hash", async () => {
    renderRoutes();
    vi.mocked(window.scrollTo).mockClear();

    await userEvent.click(
      screen.getByRole("link", { name: "go to an anchor" }),
    );

    expect(screen.getByText("third page")).toBeInTheDocument();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("still scrolls when the destination has no hash", async () => {
    renderRoutes();
    vi.mocked(window.scrollTo).mockClear();

    await userEvent.click(screen.getByRole("link", { name: "go to second" }));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
