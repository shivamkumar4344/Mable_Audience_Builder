import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const matchingAudience = {
  name: "Viewed but not purchased",
  asOf: "2026-09-29T00:00:00.000Z",
  total: 1,
  members: [{
    anonymousId: "anon_123",
    evidence: [
      { eventType: "product_view", observedCount: 3 },
      { eventType: "purchase", observedCount: 0 }
    ]
  }]
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Audience Builder", () => {
  it("adds and removes conditions while keeping one row", () => {
    render(<App />);

    expect(screen.getAllByText(/^Condition \d+$/)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "+ Add condition" }));
    expect(screen.getAllByText(/^Condition \d+$/)).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Remove condition 2" }));
    expect(screen.getAllByText(/^Condition \d+$/)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Remove condition 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove condition 1" }));
    expect(screen.getAllByText(/^Condition \d+$/)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Remove condition 1" })).toBeDisabled();
  });

  it("shows client validation and does not call the API", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.change(screen.getAllByLabelText("Count")[0], { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview audience" }));

    expect(screen.getByText("At least requires count to be 1 or more.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows loading and then renders results", async () => {
    let resolveRequest: (value: Response) => void = () => undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Preview audience" }));
    expect(screen.getByRole("button", { name: "Previewing..." })).toBeDisabled();
    expect(screen.getByText("Loading audience preview...")).toBeInTheDocument();

    resolveRequest(response(matchingAudience));
    expect(await screen.findByText("anon_123")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows the empty state when no users match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      name: "No match",
      asOf: "2026-09-29T00:00:00.000Z",
      total: 0,
      members: []
    })));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Preview audience" }));

    expect(await screen.findByText("No users match this audience.")).toBeInTheDocument();
  });

  it("shows an API error and retries the last request", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response(matchingAudience));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Preview audience" }));
    expect(await screen.findByText("Unable to reach the audience service.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("anon_123")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
