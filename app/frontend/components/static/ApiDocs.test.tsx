import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiDocs } from "@/components/static/ApiDocs";
import { spaPaths } from "@/lib/spaPaths";

const parties = [
  {
    id: 1,
    name: "Green",
    color: "#6AB023",
    smvCode: "grn",
    canonicalName: "green",
  },
  {
    id: 2,
    name: "Labour Party",
    color: "#DC241f",
    smvCode: "lab",
    canonicalName: "labour",
  },
];

const constituencies = [
  { onsId: "E14001009", name: "Woking" },
  { onsId: "E14001605", name: "York Outer" },
];

// Mutable so the by-election describe block below can flip it without
// fighting vi.mock's hoisting.
let election: { generalElection: boolean } = { generalElection: true };

vi.mock("@/lib/referenceData", () => ({
  useParties: () => ({ data: parties, isPending: false }),
  useConstituencies: () => ({ data: constituencies, isPending: false }),
  useElection: () => ({ data: election, isPending: false }),
}));

function renderDocs(random = () => 0) {
  render(
    <MemoryRouter>
      <ApiDocs random={random} />
    </MemoryRouter>,
  );
}

describe("ApiDocs", () => {
  it("documents each party by its canonical name", () => {
    renderDocs();

    expect(screen.getByText("green")).toBeInTheDocument();
    expect(screen.getByText("labour")).toBeInTheDocument();
  });

  // The example party is random on every load on purpose — a fixed one in the
  // integration docs would read as an endorsement from a site that calls
  // itself devotedly non-partisan. Pinned here, not removed.
  it("builds its example links from the injected chooser", () => {
    renderDocs(() => 0);

    const [example] = screen.getAllByRole("link", {
      name: /willing_party_name=/,
    });
    expect(example).toHaveAttribute(
      "href",
      expect.stringContaining("willing_party_name=green"),
    );
  });

  it("picks a different party for a different draw", () => {
    renderDocs(() => 0.99);

    expect(
      screen.getAllByRole("link", { name: /willing_party_name=/ })[0],
    ).toHaveAttribute(
      "href",
      expect.stringContaining("willing_party_name=labour"),
    );
  });

  it("hides the by-election constituency list at a general election", () => {
    renderDocs();

    expect(
      screen.queryByText(/constituencies for this by election/i),
    ).toBeNull();
  });

  it("links to the ported contact screen", () => {
    renderDocs();

    expect(screen.getByRole("link", { name: /get in touch/i })).toHaveAttribute(
      "href",
      spaPaths.contact,
    );
  });
});

describe("ApiDocs at a by-election", () => {
  beforeEach(() => {
    election = { generalElection: false };
  });

  afterEach(() => {
    election = { generalElection: true };
  });

  it("lists each constituency's name, escaped constituency_name and ons id", () => {
    renderDocs();

    expect(
      screen.getByText(/constituencies for this by election/i),
    ).toBeInTheDocument();

    for (const constituency of constituencies) {
      expect(screen.getAllByText(constituency.name).length).toBeGreaterThan(0);
      expect(
        screen.getAllByText(encodeURIComponent(constituency.name)).length,
      ).toBeGreaterThan(0);
      expect(screen.getByText(constituency.onsId)).toBeInTheDocument();
    }
  });
});
