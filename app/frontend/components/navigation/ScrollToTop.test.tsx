import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollToTop } from "@/components/navigation/ScrollToTop";

// jsdom implements no scrolling at all, so `Element.prototype.scrollIntoView`
// does not exist and there is nothing for `vi.spyOn` to wrap. Install the mock
// on the prototype instead; its recorded `this` tells us which element was
// scrolled to.
const scrollIntoView = vi.fn();

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
              <Link to="/third#nowhere">go to a missing anchor</Link>
              <Link to="/third#a%20spaced%20id">go to an encoded anchor</Link>
              <Link to="/third#%zz">go to a malformed anchor</Link>
            </>
          }
        />
        <Route path="/second" element={<p>second page</p>} />
        <Route
          path="/third"
          element={
            <>
              <p>third page</p>
              <p id="middle">the middle of the third page</p>
              <p id="a spaced id">an id that needs decoding</p>
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ScrollToTop", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
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

  // `history.pushState` performs no fragment navigation, and this app has no
  // <ScrollRestoration>, so nothing else resolves the hash: a /faq#legal link
  // only lands on its heading because this component puts it there.
  it("scrolls the hash's target into view", async () => {
    renderRoutes();
    vi.mocked(window.scrollTo).mockClear();

    await userEvent.click(
      screen.getByRole("link", { name: "go to an anchor" }),
    );

    expect(screen.getByText("third page")).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByText("the middle of the third page"),
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("decodes a percent-encoded hash before looking the element up", async () => {
    renderRoutes();
    vi.mocked(window.scrollTo).mockClear();

    await userEvent.click(
      screen.getByRole("link", { name: "go to an encoded anchor" }),
    );

    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByText("an id that needs decoding"),
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  // `decodeURIComponent("%zz")` throws URIError, and an uncaught throw here is
  // inside an effect — it would unmount the route rather than merely fail to
  // scroll.
  it("survives a malformed percent-encoded hash", async () => {
    renderRoutes();
    vi.mocked(window.scrollTo).mockClear();

    await userEvent.click(
      screen.getByRole("link", { name: "go to a malformed anchor" }),
    );

    expect(screen.getByText("third page")).toBeInTheDocument();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("falls back to the top when the hash names no element", async () => {
    renderRoutes();
    vi.mocked(window.scrollTo).mockClear();

    await userEvent.click(
      screen.getByRole("link", { name: "go to a missing anchor" }),
    );

    expect(screen.getByText("third page")).toBeInTheDocument();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("still scrolls when the destination has no hash", async () => {
    renderRoutes();
    vi.mocked(window.scrollTo).mockClear();

    await userEvent.click(screen.getByRole("link", { name: "go to second" }));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
